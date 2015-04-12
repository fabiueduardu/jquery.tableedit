/*!
 * jquery.tabledit
 * Copyright(c) 2015 Fabio Eduardo
 */

(function ($) {

    $.tableedit = function (el, options) {
        var plugin = this;
        var $el = $(el);

        var defaults = {
            url_post: null,
            edit: 'a[data-edit]',
            save: 'a[data-save]',
            cancel: 'a[data-cancel]',
            error: {
                fieldClass: 'field-error',
                msgClass: 'msg-error'
            },
            input: { cssClass: 'form-control' },
            dataType: 'json',
            keyValueDelimiter: '|',
            onInvalidField: null,
            OnbeforeSend:null,
            OnComplete:null,
            OnSaveError: null,
            OnSaveSuccess: null,
            OnSave: function (data) {
                var url = $el.data('url-post') || defaults.url_post;
                var result = false;
                $.ajax({
                    type: 'POST',
                    url: url,
                    data: data,
                    dataType: defaults.dataType,
                    async: false,
                    beforeSend:defaults.OnbeforeSend,
                    complete:defaults.OnComplete,
                    error: function (data, error) {
                        if (defaults.OnSaveError) defaults.OnSaveError(data, error);
                        result = false;
                    },
                    success: function (data) {
                        if (defaults.OnSaveSuccess) defaults.OnSaveSuccess(data);
                        result = true;
                    }
                });
                return result;
            }
        };
        var model_input = {
            text: '<input type=text  />',
            select: '<select  />',
            select_option: '<option />'
        };

        var init = function () {
            defaults = $.extend({}, defaults, options);
            onLoad();
        }

        var onLoad = function () {
            $el.find(defaults.save).on('click', function () { onSave($(this).parents('tr:first')); });
            $el.find(defaults.cancel).on('click', function () { onCancel($(this).parents('tr:first')); });
            $el.find(defaults.edit).on('click', function () { onEdit($(this).parents('tr:first')); });
            swapAct([$el.find(defaults.edit)], [$el.find(defaults.save), $el.find(defaults.cancel)])
        }

        var onUnload = function ($tr) {
            $($tr).find('td[data-id]').each(function (i, v) {
                var $td = $(this);
                var value = getValueTD($td, $td.data('edit'));
                $td.text(value.value ? value.text : '');
            });
        }

        var onEdit = function ($tr) {
            swapAct([$tr.find(defaults.save), $tr.find(defaults.cancel)], [$tr.find(defaults.edit)])
            $($tr).find('td[data-edit]').each(function () {
                var $td = $(this);
                setValueTD($tr, $td, $td.data('edit'));
            });
        }

        var onSave = function ($tr) {
            var values = {};
            $($tr).find('td[data-id]').each(function () {
                var $td = $(this);
                var value = getValueTD($td, $td.data('edit'));
                if (isValid($td, value.value)) values[$td.data('id')] = value.value;
            });

            if (onValidate($tr) && defaults.OnSave(values)) {
                swapAct([$tr.find(defaults.edit)], [$tr.find(defaults.save), $tr.find(defaults.cancel)])
                onUnload($tr);
            }
        }

        var onValidate = function ($tr) {
            var errors = [];
            $($tr).find('td[data-isvalid=false]').each(function () {
                var $td = $(this);
                var msg = $td.data('required-msg') || ($td.data('id') + ' is required!');
                errors.push(msg);
                if (!defaults.onInvalidField && $td.find('span.' + defaults.error.msgClass).size() == 0) $td.append('<span class=' + defaults.error.msgClass + '>' + msg + '</span>');
            });

            if (errors.length == 0)
                return true;

            if (defaults.onInvalidField) defaults.onInvalidField(errors)
            return false;
        }

        var onCancel = function ($tr) {
            swapAct([$tr.find(defaults.edit)], [$tr.find(defaults.save), $tr.find(defaults.cancel)])
            onUnload($tr);
        }

        var swapAct = function (toShow, toHide) {
            $(toShow).each(function (i, v) { if (typeof v == 'string') $(v).show(); else v.show(); })
            $(toHide).each(function (i, v) { if (typeof v == 'string') $(v).hide(); else v.hide(); })
        }

        var setValueTD = function ($tr, $td, type) {
            var id = $td.data('id') + '_' + $tr.index();
            var data_attr = $td.data('attr');
            switch (type) {
                case 'text':
                    var $m = $(model_input.text).addClass(defaults.input.cssClass);
                    $td.html($m.val($td.text()));
                    break;
                case 'select':
                    var $m = $(model_input.select).addClass(defaults.input.cssClass);
                    var td_text = $td.text().trim();
                    $(getList($td.data('list'))).each(function (i, v) {
                        $m.append($(model_input.select_option).attr('value', v.value).text(v.text));
                    });
                    if (td_text != '') 
                        $m.find('option').filter(function(i) { return $(this).text() == td_text; }).attr('selected', 'selected');
                    $td.html($m);
                    break;
                case 'radio':
                case 'checkbox':
                    var td_text = $td.text().trim();
                    $td.empty();
                    $(getList($td.data('list'))).each(function (i, v) {
                        var checked = '';
                        $(td_text.split(defaults.keyValueDelimiter)).each(function (i, _v) { if (_v == v.text) checked = 'checked'; });
                        $td.append($('<label><span>' + v.text + '</span><input type=' + type + ' name=' + id + ' value=' + v.value + ' text=' + v.text + ' ' + checked + ' /></label>'));
                    });
                    break;
            }

            $(getList($td.data('attr'))).each(function (i, v) {  $td.find('input,select').attr(v.text, v.value); });
        }

        var getValueTD = function ($td, type) {
            var value = { value: '', text: '' };
            switch (type) {
                case 'text':
                    value.value = value.text = $td.find('input').val();
                    break;
                case 'select':
                    value.text = $td.find('select option:selected').text();
                    value.value = $td.find('select').val();
                    break;
                case 'radio':
                case 'checkbox':
                    $td.find('input[type=' + type + ']:checked').each(function (i, v) {
                        value.value += (value.value ? defaults.keyValueDelimiter : '') + $(this).val();
                        value.text += (value.text ? defaults.keyValueDelimiter : '') + $(this).attr('text');
                    });
                    break;
                default:
                    value.value = value.text = $td.text();
            }
            return value;
        }

        var getList = function (value) {
            if (!value) return;  
            else if(value.indexOf('[')==0) return eval(value);
            else if(window[value]) return window[value].call();
        }

        var isValid = function ($td, value) {
            var isValid = !($td.data('required') && value == '');
            $td.attr('data-isvalid', isValid);
            if (!isValid)
                $td.addClass(defaults.error.fieldClass);
            else {
                $td.removeClass(defaults.error.fieldClass);
                $td.find('span.' + defaults.error.msgClass).remove();
            }
            return isValid;
        }

        init();
    }

    $.fn.tableedit = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('tableedit'))
                $(this).data('tableedit', new $.tableedit(this, options));
        });
    }

})(jQuery);