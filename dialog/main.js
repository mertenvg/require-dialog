define([
    "jquery",
    "text!./assets/main.html"
], function($, template) {

    $('head').prepend($('<link rel="stylesheet" type="text/css" href="scripts/modules/dialog/assets/main.css" />'));

    var $overlay        = $('<div class="overlay"/>');
    var $template       = $(template);
    var dialogQueue     = [];
    var activeDialog    = null;

    var defaultSettings = {
        title       : '',
        content     : '',
        buttons     : [],
        onAdd       : null,
        onShow      : null,
        onHide      : null,
        onRemove    : null,
        showClose   : true,
        showTitle   : true,
        showButtons : true,
        modal       : false,
        priority    : 1,
        autoShow    : true
    };

    var defaultButtonSettings = {
        label           : 'OK',
        cssClass        : 'btn',
        onClick         : undefined,
        autoClickAfter  : undefined,
        onTick          : undefined,
        closeDialog     : true
    };

    var Dialog = function (title, content, customSettings) {

        var argSettings = {};

        if (arguments.length === 1 && typeof title === 'object') {
            customSettings  = title;
        } else {
            argSettings = {title: title, content: content};
        }

        var self            = this;
        var $el             = undefined;
        var settings        = $.extend(
            {},
            defaultSettings,
            customSettings,
            argSettings
        );

        Dialog.queue(self);

        // Private methods.

        function init () {
            if (typeof $el !== 'undefined') {
                return;
            }

            $el = $template.clone();

            $el.find('.title > .close').on('click', function (evt) {
                self.remove();
            });

            self.setTitle(settings.title);
            self.setContent(settings.content);

            if (!!settings.showButtons === true &&
                typeof settings.buttons === 'object' &&
                settings.buttons.length > 0
            ) {
                for (var i in settings.buttons) {
                    initButton(settings.buttons[i]);
                }
            } else {
                $el.addClass('no-buttons');
            }

            if (!!settings.showClose === false) {
                $el.addClass('no-close');
            }
        }

        function initButton (btnSettings) {
            if (typeof $el === 'undefined') {
                return;
            }

            btnSettings = $.extend(
                {},
                defaultButtonSettings,
                btnSettings
            );

            var counter     = 1;
            var interval    = undefined;
            var timeout     = undefined;
            var $btn        = $('<a/>').addClass(btnSettings.cssClass).html(btnSettings.label);

            $btn.on('click', function () {
                $(this).trigger('stop-ticker');
                var result = triggerCallback(btnSettings.onClick)

                if (!!btnSettings.closeDialog === false || (typeof result !== 'undefined' && !!result === false)) {
                    return;
                }

                self.remove();
            });

            if (typeof btnSettings.autoClickAfter !== 'undefined' && (btnSettings.autoClickAfter * 1) > 0) {
                if (typeof btnSettings.onTick === 'function') {
                    $btn.one('start-ticker', function () {
                        interval = setInterval(function () {
                            btnSettings.onTick($btn, counter);
                            counter++;
                        }, 1000);

                        timeout = setTimeout(function () {
                            $btn.trigger('click');
                        }, btnSettings.autoClickAfter);
                    }).one('stop-ticker', function () {
                        if (typeof interval !== 'undefined' && interval !== null) {
                            clearInterval(interval);
                        }
                        if (typeof timeout !== 'undefined' && timeout !== null) {
                            clearTimeout(timeout);
                        }
                    });
                }
            }

            $el.find('.buttonbar').append($btn);
        }

        function attach (callback) {
            init();

            $('body').append($overlay.hide()).append($el.hide());

            triggerCallback(settings.onAdd);

            return triggerCallback(callback);
        }

        function detach (callback) {
            if (typeof $el !== 'undefined') {
                $el.detach();
                $overlay.detach();
            }

            return triggerCallback(callback);
        }

        function triggerCallback (callback) {
            if (typeof callback === 'function') {
                return callback(self);
            }

            return undefined;
        }

        // Public methods.

        /**
         * Get the dialogs priority value
         * @return integer
         */
        this.getPriority = function () {
            return settings.priority;
        };

        /**
         * Get the dialog settings
         * @return object
         */
        this.getSettings = function () {
            return settings;
        };

        /**
         * Reset the dialog position
         */
        this.reposition = function () {
            if (typeof $el === 'undefined') {
                return self;
            }

            var w = $el.width();
            var h = $el.height();

            $el.css({
                marginLeft  : w / 2 * -1,
                marginTop   : h / 2 * -1
            });

            return self;
        };

        /**
         * Set the dialog title
         * @return Dialog
         */
        this.setTitle = function (title) {
            settings.title = title;

            if (typeof $el === 'undefined') {
                return self;
            }

            var $container = $el.find('.title > .label').empty();

            if (typeof title === 'object') {
                $container.append($(title));
            } else {
                $container.html(title);
            }

            return self;
        };

        /**
         * Set the dialog content
         * @return Dialog
         */
        this.setContent = function (content) {
            settings.content = content;

            if (typeof $el === 'undefined') {
                return self;
            }

            var $container = $el.find('.content').empty();

            if (typeof title === 'object') {
                $container.append($(content));
            } else {
                $container.html(content);
            }

            self.reposition();

            return self;
        };

        /**
         * Add a button to the button bar.
         */
        this.addButton = function (label, customButtonSettings) {
            var argButtonSettings = {};

            if (arguments.length === 1 && typeof label === 'object') {
                customButtonSettings = label;
            } else {
                argButtonSettings = {label: label};
            }

            var btnSettings = $.extend(
                {},
                customButtonSettings,
                argButtonSettings
            );

            settings.buttons.push(btnSettings);

            initButton(btnSettings);

            return self;
        };

        /**
         * Show the dialog
         * @return Dialog
         */
        this.show = function (callback) {
            if (activeDialog instanceof Dialog) {
                return activeDialog.hide(function () {
                    self.show(callback);
                });
            }

            activeDialog = self;

            attach();

            if (!!settings.modal === true) {
                $overlay.fadeIn();
            }

            $el.fadeIn(function () {
                triggerCallback(settings.onShow);
                triggerCallback(callback);

                $el.find('.buttonbar > .btn').trigger('start-ticker');
            });

            self.reposition();

            return self;
        };

        /**
         * Hide the dialog
         * @return Dialog
         */
        this.hide = function (callback) {
            // if i'm not active then there's nothing to do.
            if (self !== activeDialog) {
                return triggerCallback(callback);
            }

            if (settings.modal === true && $overlay.is(':visible')) {
                $overlay.fadeOut();
            }

            $el.fadeOut(function () {
                activeDialog = undefined;

                triggerCallback(settings.onHide);
                detach(callback);
            });

            return self;
        };

        /**
         * Remove the dialog from display and the queue.
         * @return Dialog
         */
        this.remove = function (callback) {
            self.hide(function () {
                Dialog.unQueue(self);

                triggerCallback(settings.onRemove);
                triggerCallback(callback);

                var next = Dialog.getPrioritized();
                if (typeof next !== 'undefined') {
                    next.show();
                }
            });
        };

        /**
         * Alias of show();
         */
        this.open = function (callback) {
            return self.show(callback);
        };

        /**
         * Alias of remove();
         */
        this.close = function (callback) {
            return self.remove(callback);
        };

        if (!!settings.autoShow === true && (
            !(activeDialog instanceof Dialog) ||
            self.getPriority() > activeDialog.getPriority()
        )) {
            self.show();
        }
    }

    /**
     * Make a new dialog
     */
    Dialog.make = function (title, content, customSettings) {
        return new Dialog(title, content, customSettings);
    };

    /**
     * Get a handle to the current active dialog (if there is one)
     */
    Dialog.getActive = function () {
        return activeDialog;
    };

    /**
     * Get a handle to the current active dialog (if there is one)
     */
    Dialog.getAll = function () {
        return dialogQueue;
    };

    /**
     * Get a handle to the newest queued dialog (if there is one)
     *
     * @returns Dialog
     */
    Dialog.getNewest = function () {
        if (dialogQueue.length === 0) {
            return undefined;
        }

        return dialogQueue[dialogQueue.length - 1];
    };

    /**
     * Get a handle to the oldest queued dialog (if there is one)
     *
     * @returns Dialog
     */
    Dialog.getOldest = function () {
        if (dialogQueue.length === 0) {
            return undefined;
        }

        return dialogQueue[0];
    };

    /**
     * Get a handle to the highest priority queued dialog (if there is one)
     *
     * @returns Dialog
     */
    Dialog.getPrioritized = function () {
        if (dialogQueue.length === 0) {
            return undefined;
        } else if (dialogQueue.length === 1) {
            return dialogQueue[0];
        }

        var highest = dialogQueue[0];

        for (var i in dialogQueue) {
            if (dialogQueue[i].getPriority() > highest.getPriority()) {
                highest = dialogQueue[i];
            }
        }

        return highest;
    };

    /**
     * Close all dialogs
     */
    Dialog.closeAll = function (suppressCloseEvent) {
        suppressCloseEvent = !!suppressCloseEvent || false

        for (var i in dialogQueue) {
            dialogQueue[i].close();
        }
    };

    Dialog.queue = function (dialog) {
        if (!(dialog instanceof Dialog)) {
            return;
        }

        dialogQueue.push(dialog);
    };

    Dialog.unQueue = function (dialog) {
        var i;
        if (typeof dialogQueue.indexOf === 'undefined') {
            for (i in dialogQueue) {
                if (dialogQueue[i] === dialog) {
                    break;
                }
            }
        } else {
            i = dialogQueue.indexOf(dialog);
        }

        if (i === -1) {
            return;
        }

        dialogQueue.splice(i, 1);
    };

    return Dialog;
});
