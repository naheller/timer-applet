const Lang = imports.lang;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
// const SignalManager = imports.misc.signalManager;
// const Gettext = imports.gettext;
// const UUID = 'ntimer@nate';

// Gettext.bindtextdomain(UUID, GLib.get_home_dir() + '/.local/share/locale');

// function _(str) {
//     return Gettext.dgettext(UUID, str);
// }

const TIMER_INTERVAL_MS = 1000;

const ONE_MIN_IN_SECONDS = 60;
const ONE_HOUR_IN_SECONDS = ONE_MIN_IN_SECONDS * 60;
const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS * 24;

const BUTTON_LABEL_START = 'Start';
const BUTTON_LABEL_RESUME = 'Resume';
const BUTTON_LABEL_PAUSE = 'Pause';
const BUTTON_LABEL_RESET = 'Reset';

const ICON_NAME_START = 'media-playback-start-symbolic';
const ICON_NAME_PAUSE = 'media-playback-pause-symbolic';
const ICON_NAME_STOP = 'media-playback-stop-symbolic';
const ICON_NAME_INCR = 'list-add-symbolic';
const ICON_NAME_DECR = 'list-remove-symbolic';

const ICON_SIZE_LG = 20;
const ICON_SIZE_SM = 12;

const NOTIFICATION_TITLE = 'Timer';
const NOTIFICATION_MSG = 'Time Up!';

const DIGIT_NAMES = {
    SECOND_TENS: 'SECOND_TENS',
    SECOND_ONES: 'SECOND_ONES',
    MINUTE_TENS: 'MINUTE_TENS',
    MINUTE_ONES: 'MINUTE_ONES',
    HOUR_TENS: 'HOUR_TENS',
    HOUR_ONES: 'HOUR_ONES'
};

const CLOCK_INCREMENT = 'INCREMENT';
const CLOCK_DECREMENT = 'DECREMENT';


function MyApplet(metadata, orientation, panelHeight, instanceId) {
    this._init(metadata, orientation, panelHeight, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panelHeight, instanceId) {
        Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

        try {
            this.set_applet_icon_symbolic_name('alarm');
            // this.set_applet_icon_symbolic_name('alarm');
            this.set_applet_tooltip(_('Simple Timer'));

            // this.menuManager = new PopupMenu.PopupMenuManager(this);
            // this.menu = new Applet.AppletPopupMenu(this, this._orientation);
            // this.menu.addAction('play', () => { this.showNotification(); })
            this.timerId = null;
            this.timerInitialSec = 3728;
            this.timerCurrentSec = this.timerInitialSec;

            // const clockObj = getClockValuesFromSeconds(this.timerInitialSec);
            // global.log(clockObj)

            this.timerClockMenuItem = '';
            this.timerClockMenuItemSec = '';

            this.clockDigitSecondOnes = 8;

            this.notificationSource = null;
            this.addNotificationSource();
            
            this.startPauseButton = null;
            this.resetButton = null;

            this.buildPopupMenu();
            // this.buildBoxLayout();

            // this._signalManager = new SignalManager.SignalManager(null);
            // this._signalManager.connect(this, 'changed::timerInitialSec', () => {
            //     this.secondOnesDigit.child.text = `${this.timerInitialSec}`
            // });
        }
        catch (e) {
            global.logError(e);
        }
    },

    on_applet_clicked(event) {
        this.menu.toggle();
    },
    
    on_applet_middle_clicked(event) {
        // toggle play/pause?
    },

    buildPopupMenu() {
        this.actor.add_style_class_name('timer');

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, this._orientation);

        // Timer clock
        const clockString = getClockStringFromSeconds(this.timerCurrentSec);
        this.timerClockMenuItem = new PopupMenu.PopupMenuItem(clockString);
        this.timerClockMenuItem.setSensitive(false);

        // Timer clock seconds (debug)
        this.timerClockMenuItemSec = new PopupMenu.PopupMenuItem(`${this.timerCurrentSec}`);
        this.timerClockMenuItemSec.setSensitive(false);

        // Add menu items
        // this.menu.addMenuItem(this.timerClockMenuItem);
        // this.menu.addMenuItem(this.timerClockMenuItemSec);

        const menuSection = new PopupMenu.PopupMenuSection({ style_class: 'popup-menu-section' });
        
        this.clock = this.getClock();
        this.controlBar = this.getControlBar();
        // this.clock.get_children()[0].get_children()[1].child.set_text('10')
        // global.log(' this.clock.get_children()[0].get_children()[1]', this.clock.get_children()[0].get_children()[1])
        
        menuSection.actor.add_actor(this.clock);
        menuSection.actor.add_actor(this.controlBar);
        
        this.menu.addMenuItem(menuSection);

        this.menuManager.addMenu(this.menu);
    },

    getClock() {
        const {
            secondTensColumn,
            secondOnesColumn,
            minuteOnesColumn,
            minuteTensColumn,
            hourOnesColumn,
            hourTensColumn
        } = this.getClockElements();

        const clockBox = new St.BoxLayout({
            name: 'clock',
            x_align: Clutter.ActorAlign.CENTER
        });

        clockBox.add_child(hourTensColumn);
        clockBox.add_child(hourOnesColumn);
        clockBox.add_child(getClockDigit(':'));
        clockBox.add_child(minuteTensColumn);
        clockBox.add_child(minuteOnesColumn);
        clockBox.add_child(getClockDigit(':'));
        clockBox.add_child(secondTensColumn);
        clockBox.add_child(secondOnesColumn);

        return clockBox;
    },

    getClockElements() {
        const {
            SECOND_TENS,
            SECOND_ONES,
            MINUTE_TENS,
            MINUTE_ONES,
            HOUR_TENS,
            HOUR_ONES
        } = DIGIT_NAMES;

        const {
            secondOnes,
            secondTens,
            minuteOnes,
            minuteTens,
            hourOnes,
            hourTens
        } = getClockValuesFromSeconds(this.timerInitialSec);

        const secondTensColumn = this.getClockColumn(SECOND_TENS, secondTens);
        const secondOnesColumn = this.getClockColumn(SECOND_ONES, secondOnes);
        const minuteTensColumn = this.getClockColumn(MINUTE_TENS, minuteTens);
        const minuteOnesColumn = this.getClockColumn(MINUTE_ONES, minuteOnes);
        const hourTensColumn = this.getClockColumn(HOUR_TENS, hourTens);
        const hourOnesColumn = this.getClockColumn(HOUR_ONES, hourOnes);

        return {
            secondTensColumn,
            secondOnesColumn,
            minuteOnesColumn,
            minuteTensColumn,
            hourOnesColumn,
            hourTensColumn
        }
    },

    getClockColumn(digitName, digitValue) {
        const iconIncrement = getIcon(ICON_NAME_INCR, ICON_SIZE_SM);
        const iconDecrement = getIcon(ICON_NAME_DECR, ICON_SIZE_SM);

        const incrementButtonName = `${DIGIT_NAMES[digitName]}_INC`;
        const decrementButtonName = `${DIGIT_NAMES[digitName]}_DEC`;

        this[incrementButtonName] = getButton(iconIncrement);
        this[incrementButtonName].connect('clicked', () => {
            this.adjustClockDigit(CLOCK_INCREMENT, digitName);
        });

        this[decrementButtonName] = getButton(iconDecrement);
        this[decrementButtonName].connect('clicked', () => {
            this.adjustClockDigit(CLOCK_DECREMENT, digitName);
        });

        // Set digit on instance level so it can be updated elsewhere
        this[digitName] = getClockDigit(`${digitValue}`);

        const column = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        column.add_child(this[incrementButtonName]);
        column.add_child(this[digitName]);
        column.add_child(this[decrementButtonName]);

        return column;
    },

    getControlBar() {
        const iconStart = getIcon(ICON_NAME_START, ICON_SIZE_LG);
        const iconPause = getIcon(ICON_NAME_PAUSE, ICON_SIZE_LG);
        const iconStop = getIcon(ICON_NAME_STOP, ICON_SIZE_LG);

        // const buttonPause = new St.Button({
        //     reactive: true,
        //     can_focus: true,
        //     // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        //     style_class: 'popup-menu-item',
        //     // style: 'width: 20px; padding: 10px!important',
        //     child: iconPause
        // })

        this.startPauseButton = getButton(iconStart, true);
        this.resetButton = getButton(iconStop);

        this.startPauseButton.connect('clicked', (button) => {
            // const isActive = this.startPauseButton.get_active();
            // global.log('isActive', isActive);
            if (button.checked) {
                this.startTimer();
            } else {
                this.pauseTimer();
            }
            // return true;
        });

        this.resetButton.connect('clicked', (button) => {
            this.resetTimer();
            // return true;
        });
        
        // buttonPause.connect('clicked', () => {
        //     this.pauseTimer();
        //     // return true;
        // });

        const controlBar = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER
        });

        controlBar.add_child(this.startPauseButton);
        controlBar.add_child(this.resetButton);

        // this.resetButton.set_style('height:0;')

        global.log('this.resetButton', this.resetButton)

        return controlBar;
    },

    showAllClockAdjustButtons() {
        Object.keys(DIGIT_NAMES).forEach(digitName => {
            this[`${digitName}_INC`].show();
            this[`${digitName}_DEC`].show();
        });
    },

    hideAllClockAdjustButtons() {
        Object.keys(DIGIT_NAMES).forEach(digitName => {
            this[`${digitName}_INC`].hide();
            this[`${digitName}_DEC`].hide();
        });
    },

    addNotificationSource() {
        this.notificationSource = new MessageTray.SystemNotificationSource();
        Main.messageTray.add(this.notificationSource);
    },

    showNotification(msg) {
        let notification = new MessageTray.Notification(this.notificationSource, NOTIFICATION_TITLE, msg);
        // notification.setTransient(false);
        // notification.setUrgency(MessageTray.Urgency.NORMAL);
        this.notificationSource.notify(notification);
    },

    startTimer() {
        if (this.timerId !== null) return;

        this.timerId = setInterval(
            () => {
                if (this.timerCurrentSec > 0) {
                    this.tickTimer();
                } else {
                    this.resetTimer();
                    this.showNotification(NOTIFICATION_MSG);
                }
            },
            TIMER_INTERVAL_MS
        );

        // global.log('this.startPauseButton', this.startPauseButton)

        this.startPauseButton.child.set_icon_name(ICON_NAME_PAUSE);
        this.hideAllClockAdjustButtons();

        // this.startButton.setSensitive(false);
        // this.pauseButton.setSensitive(true);
        // this.resetButton.setSensitive(true);
    },

    pauseTimer() {
        if (this.timerId === null) {
            return;
        }

        this.clearTimerInterval();
        this.startPauseButton.child.set_icon_name(ICON_NAME_START);
        this.showAllClockAdjustButtons();

        // clearInterval(this.timerId);
        // this.timerCurrentSec = this.timerInitialSec;
        // this.timerId = null;
        // this.timerClockMenuItem.label.text = `${this.timerInitialSec}`;
        // this.resetButton.setSensitive(false);
        // this.set_applet_label('');

        // this.startPauseButton.child = ICON_NAME_PAUSE;

        // this.startButton.setSensitive(true);
        // this.startButton.label.text = BUTTON_LABEL_RESUME;
    },

    resetTimer() {
        // if (this.timerId === null) {
        //     return;
        // }

        this.clearTimerInterval();
        // clearInterval(this.timerId);
        this.timerCurrentSec = this.timerInitialSec;
        // this.timerId = null;

        this.updateClockText();
        this.startPauseButton.set_checked(false);
        this.startPauseButton.child.set_icon_name(ICON_NAME_START);
        this.showAllClockAdjustButtons();

        // this.startButton.label.text = BUTTON_LABEL_START;

        // this.resetButton.setSensitive(false);
        // this.pauseButton.setSensitive(false);
        // this.startButton.setSensitive(true);
        // this.set_applet_label('');
    },

    tickTimer() {
        --this.timerCurrentSec;
        this.updateClockText();
        // this.set_applet_label(`${this.timerCurrentSec}`);
    },

    clearTimerInterval() {
        clearInterval(this.timerId);
        this.timerId = null;
    },

    // updateControlBar() {
    //     if (this.timerId === null) {
    //         this.startPauseButton.checked = false;
    //         this.startPauseButton.child.set_icon_name(ICON_NAME_START);
    //     } else {
    //         this.startPauseButton.checked = true;
    //         this.startPauseButton.child.set_icon_name(ICON_NAME_PAUSE);
    //     }
    // },

    updateClockText() {
        const clockString = getClockStringFromSeconds(this.timerCurrentSec);
        this.timerClockMenuItem.label.text = clockString;
        this.timerClockMenuItemSec.label.text = `${this.timerCurrentSec}`;
        this.set_applet_tooltip(clockString);

        const {
            SECOND_TENS,
            SECOND_ONES,
            MINUTE_TENS,
            MINUTE_ONES,
            HOUR_TENS,
            HOUR_ONES
        } = DIGIT_NAMES;

        const {
            secondOnes,
            secondTens,
            minuteOnes,
            minuteTens,
            hourOnes,
            hourTens
        } = getClockValuesFromSeconds(this.timerCurrentSec);

        this[HOUR_TENS].child.set_text(`${hourTens}`);
        this[HOUR_ONES].child.set_text(`${hourOnes}`);
        this[MINUTE_TENS].child.set_text(`${minuteTens}`);
        this[MINUTE_ONES].child.set_text(`${minuteOnes}`);
        this[SECOND_TENS].child.set_text(`${secondTens}`);
        this[SECOND_ONES].child.set_text(`${secondOnes}`);
    },

    adjustClockDigit(adjustmentType, digitName) {
        const {
            SECOND_TENS,
            SECOND_ONES,
            MINUTE_TENS,
            MINUTE_ONES,
            HOUR_TENS,
            HOUR_ONES
        } = DIGIT_NAMES;

        const digitToSeconds = {
            [HOUR_TENS]: ONE_HOUR_IN_SECONDS * 10,
            [HOUR_ONES]: ONE_HOUR_IN_SECONDS,
            [MINUTE_TENS]: ONE_MIN_IN_SECONDS * 10,
            [MINUTE_ONES]: ONE_MIN_IN_SECONDS,
            [SECOND_TENS]: 10,
            [SECOND_ONES]: 1
        };

        const secondsDelta = digitToSeconds[DIGIT_NAMES[digitName]];

        if (adjustmentType === CLOCK_INCREMENT) {
            const newSecondsValue = this.timerCurrentSec + secondsDelta;
            if (newSecondsValue <= ONE_DAY_IN_SECONDS) {
                this.timerCurrentSec = this.timerInitialSec = newSecondsValue;
            }
        } else if (adjustmentType === CLOCK_DECREMENT) {
            const newSecondsValue = this.timerCurrentSec - secondsDelta;
            if (newSecondsValue >= 0) {
                this.timerCurrentSec = this.timerInitialSec = newSecondsValue;
            }
        }

        this.updateClockText();
    }
};

function getClockStringFromSeconds(totalSeconds) {
    let [hourStr, minStr, secStr] = ['', '00:', '00'];
    let remainder = totalSeconds;

    if (remainder >= ONE_HOUR_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_HOUR_IN_SECONDS);
        remainder %= ONE_HOUR_IN_SECONDS;
        hourStr = `${quotient}:`;
    }

    if (remainder >= ONE_MIN_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_MIN_IN_SECONDS);
        const padding = (!!hourStr && quotient < 10) ? '0' : '';
        remainder %= ONE_MIN_IN_SECONDS;
        minStr = `${padding}${quotient}:`;
    }

    if (remainder >= 0) {
        const padding = (!!minStr && remainder < 10) ? '0' : '';
        secStr = `${padding}${remainder}`;
    }

    return hourStr + minStr + secStr;
}

function getClockValuesFromSeconds(totalSeconds) {
    let [
        secondOnes,
        secondTens,
        minuteOnes,
        minuteTens,
        hourOnes,
        hourTens
    ] = [0, 0, 0, 0, 0, 0];

    let remainder = totalSeconds;

    if (remainder >= ONE_HOUR_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_HOUR_IN_SECONDS);
        remainder %= ONE_HOUR_IN_SECONDS;

        if (quotient > 9) {
            const numString = String(quotient);
            hourTens = Number(numString[0]);
            hourOnes = Number(numString[1]);
        } else {
            hourOnes = quotient;
        }
    }

    if (remainder >= ONE_MIN_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_MIN_IN_SECONDS);
        remainder %= ONE_MIN_IN_SECONDS;
        
        if (quotient > 9) {
            const numString = String(quotient);
            minuteTens = Number(numString[0]);
            minuteOnes = Number(numString[1]);
        } else {
            minuteOnes = quotient;
        }
    }

    if (remainder >= 0) {
        if (remainder > 9) {
            const numString = String(remainder);
            secondTens = Number(numString[0]);
            secondOnes = Number(numString[1]);
        } else {
            secondOnes = remainder;
        }
    }

    return {
        secondOnes,
        secondTens,
        minuteOnes,
        minuteTens,
        hourOnes,
        hourTens
    };
}

function getSecondsFromClockString(hourStr, minStr, secStr) {
    const hourSeconds = Number(hourStr) * ONE_HOUR_IN_SECONDS;
    const minSeconds = Number(minStr) * ONE_MIN_IN_SECONDS;
    const seconds = Number(secStr);

    return hourSeconds + minSeconds + seconds;
}

function setInterval(callback, ms) {
    // let args = [];
    // if (arguments.length > 2) {
    //     args = args.slice.call(arguments, 2);
    // }

    let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        callback.call(null);
        // callback.call(null, ...args);
        return true; // Repeat
    });

    // if (id && (_sourceIds.indexOf(id) === -1)) _sourceIds.push(id);

    return id;
}

function clearInterval(id) {
    if (id) {
      GLib.source_remove(id);
    }
};

function getIcon(name, size) {
    return new St.Icon({
        icon_type: St.IconType.SYMBOLIC,
        icon_name: name,
        icon_size: size,
        // style: 'icon-size: 20px;',
        // style_class: 'popup-menu-icon' // this specifies the icon-size
    })
}

function getButton(iconName, isToggle = false) {
    const button = new St.Button({
        // name: buttonName,
        toggle_mode: isToggle,
        reactive: true,
        // can_focus: true,
        // track_hover: true,
        // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        style_class: 'popup-menu-item',
        style: 'width: 20px; padding: 10px 5px;',
        child: iconName
    });

    // if (onClick) {
    //     button.connect('clicked', () => {
    //         onClick();
    //         // return true;
    //     });
    // }

    return button;
}

function getClockDigit(text) {
    const label = new St.Label({
        text,
        style: 'font-size: 20px;',
    });

    const bin = new St.Bin();
    bin.set_child(label);

    return bin;
}

function main(metadata, orientation, panelHeight, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instanceId);
    return myApplet;
}