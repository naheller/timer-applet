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
// const UUID = "ntimer@nate";

// Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

// function _(str) {
//     return Gettext.dgettext(UUID, str);
// }

const TIMER_INTERVAL_MS = 1000;
const ONE_HOUR_IN_SECONDS = 3600;
const ONE_MIN_IN_SECONDS = 60;

const BUTTON_LABEL_START = "Start";
const BUTTON_LABEL_RESUME = "Resume";
const BUTTON_LABEL_PAUSE = "Pause";
const BUTTON_LABEL_RESET = "Reset";

const ICON_NAME_START = "media-playback-start-symbolic";
const ICON_NAME_PAUSE = "media-playback-pause-symbolic";
const ICON_NAME_STOP = "media-playback-stop-symbolic";
const ICON_NAME_INCR = "list-add-symbolic";
const ICON_NAME_DECR = "list-remove-symbolic";

const ICON_SIZE_LG = 20;
const ICON_SIZE_SM = 12;

const NOTIFICATION_TITLE = "Timer";
const NOTIFICATION_MSG = "Time Up!";

function MyApplet(metadata, orientation, panelHeight, instanceId) {
    this._init(metadata, orientation, panelHeight, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panelHeight, instanceId) {
        Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

        try {
            this.set_applet_icon_symbolic_name("clock");
            // this.set_applet_icon_symbolic_name("alarm");
            this.set_applet_tooltip(_("Hey Shroooooo!"));

            // this.menuManager = new PopupMenu.PopupMenuManager(this);
            // this.menu = new Applet.AppletPopupMenu(this, this._orientation);
            // this.menu.addAction("play", () => { this.showNotification(); })
            this.timerId = null;
            this.timerInitialSec = 3728;
            this.timerCurrentSec = this.timerInitialSec;

            const clockObj = getClockObjectFromSeconds(this.timerInitialSec);
            global.log(clockObj)

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
            // this._signalManager.connect(this, "changed::timerInitialSec", () => {
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
        this.actor.add_style_class_name("timer");

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
        this.menu.addMenuItem(this.timerClockMenuItem);
        this.menu.addMenuItem(this.timerClockMenuItemSec);

        const menuSection = new PopupMenu.PopupMenuSection({ style_class: "popup-menu-section" });
        
        this.controlBar = this.getControlBar();
        this.clock = this.getClock();
        // this.clock.get_children()[0].get_children()[1].child.set_text('10')
        // global.log(' this.clock.get_children()[0].get_children()[1]', this.clock.get_children()[0].get_children()[1])
        
        menuSection.actor.add_actor(this.controlBar);
        menuSection.actor.add_actor(this.clock);
        
        this.menu.addMenuItem(menuSection);

        this.menuManager.addMenu(this.menu);
    },

    // updateClockUI() {
    //     const [
    //         secondOnes,
    //         colon
    //     ] = this.clock.get_children();

    //     const [
    //         secondOnesInc,
    //         secondOnesDigit,
    //         secondOnesDec
    //     ] = secondOnes.getChildren();
    // },

    getClock() {
        const {
            secondTensColumn,
            secondOnesColumn,
            colon
        } = this.getClockElements();

        const clockBox = new St.BoxLayout({
            name: 'clock',
            x_align: Clutter.ActorAlign.CENTER
        });

        clockBox.add_child(colon);
        clockBox.add_child(secondTensColumn);
        clockBox.add_child(secondOnesColumn);

        // Set on instance level so they can be updated from anywhere
        // Selected 1st index since each is a BoxLayout with three elements (inc, digit, dec)
        // this.secondOnesDigit = secondOnes.get_child_by_index;

        return clockBox;
    },

    getClockElements() {
        const {
            secondsOne,
            secondsTen,
            minutesOne,
            minutesTen,
            hoursOne,
            hoursTen
        } = getClockObjectFromSeconds(this.timerInitialSec);

        const iconIncrement = makeIcon(ICON_NAME_INCR, ICON_SIZE_SM);
        const iconDecrement = makeIcon(ICON_NAME_DECR, ICON_SIZE_SM);

        // SECOND ONES

        const incrementButtonSecOnes = makeButton(iconIncrement);
        // incrementButtonSecOnes.connect('clicked', () => {
        //     this.incrementClockDigit('secondOnesDigit');
        //     // return true;
        // });
        // incrementButtonSecOnes.setSensitive(false);
        const decrementButtonSecOnes = makeButton(iconDecrement);

        this.secondOnesDigit = makeClockDigit(`${secondsOne}`, 'secondOnesDigit');
        // this.secondOnesDigit.connect('changed::this.timerInitialSec', () => {
        //     this.secondOnesDigit.child.text = `${this.timerInitialSec}`
        // })
        const colon = makeClockDigit(':');

        // this.secondOnesDigit.child.set_text('10')
        // global.log('this.secondOnesDigit.child.text', this.secondOnesDigit.child.text)

        const secondOnesColumn = new St.BoxLayout({
            name: 'secondOnesColumn',
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        secondOnesColumn.add_child(incrementButtonSecOnes);
        secondOnesColumn.add_child(this.secondOnesDigit);
        secondOnesColumn.add_child(decrementButtonSecOnes);


        // SECOND TENS
        
        const incrementButtonSecTens = makeButton(iconIncrement);
        // incrementButtonSecTens.connect('clicked', () => {
        //     this.incrementClockDigit('secondTensDigit');
        // });
        const decrementButtonSecTens = makeButton(iconDecrement);

        this.secondTensDigit = makeClockDigit(`${secondsTen}`, 'secondTensDigit');

        const secondTensColumn = new St.BoxLayout({
            name: 'secondTensColumn',
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        secondTensColumn.add_child(incrementButtonSecTens);
        secondTensColumn.add_child(this.secondTensDigit);
        secondTensColumn.add_child(decrementButtonSecTens);

        return {
            secondTensColumn,
            secondOnesColumn,
            colon,
        }
    },

    getControlBar() {
        const iconStart = makeIcon(ICON_NAME_START, ICON_SIZE_LG);
        const iconPause = makeIcon(ICON_NAME_PAUSE, ICON_SIZE_LG);
        const iconStop = makeIcon(ICON_NAME_STOP, ICON_SIZE_LG);

        // const buttonPause = new St.Button({
        //     reactive: true,
        //     can_focus: true,
        //     // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        //     style_class: "popup-menu-item",
        //     // style: "width: 20px; padding: 10px!important",
        //     child: iconPause
        // })

        this.startPauseButton = makeButton(iconStart);
        this.resetButton = makeButton(iconStop);

        this.startPauseButton.connect('clicked', () => {
            this.startTimer();
            // return true;
        });

        this.resetButton.connect('clicked', () => {
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

        return controlBar;
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

        this.startPauseButton.icon.set_icon_name(ICON_NAME_PAUSE);

        this.startButton.setSensitive(false);
        this.pauseButton.setSensitive(true);
        this.resetButton.setSensitive(true);
    },

    pauseTimer() {
        if (this.timerId === null) {
            return;
        }

        this.clearTimerInterval();
        // clearInterval(this.timerId);
        // this.timerCurrentSec = this.timerInitialSec;
        // this.timerId = null;
        // this.timerClockMenuItem.label.text = `${this.timerInitialSec}`;
        // this.resetButton.setSensitive(false);
        // this.set_applet_label("");

        // this.startPauseButton.child = ICON_NAME_PAUSE;

        this.startButton.setSensitive(true);
        this.startButton.label.text = BUTTON_LABEL_RESUME;
    },

    resetTimer() {
        if (this.timerId === null) {
            return;
        }

        this.clearTimerInterval();
        // clearInterval(this.timerId);
        this.timerCurrentSec = this.timerInitialSec;
        // this.timerId = null;

        this.updateClockText();
        this.startButton.label.text = BUTTON_LABEL_START;

        this.resetButton.setSensitive(false);
        this.pauseButton.setSensitive(false);
        this.startButton.setSensitive(true);
        // this.set_applet_label("");
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

    updateClockText() {
        const clockString = getClockStringFromSeconds(this.timerCurrentSec);
        this.timerClockMenuItem.label.text = clockString;
        this.timerClockMenuItemSec.label.text = `${this.timerCurrentSec}`;
        this.set_applet_tooltip(clockString);
    },

    incrementClockDigit(digitType) {
        // if (this[digitType] < 9) {
            ++this[digitType];
            // this.clockDigitSecondOnesLabel.get_child().set_text(`${this[digitType]}`)
            // TODO: Idea is that numerical digit is this[digitType] (ex: this.clockDigitSecondOnes),
            // and there is an assoc label string like this.clockDigitSecondOnesLabel that we update.
        // }
        // switch(digitType) {
        //     case 'secondOnes':
        //         this.clockDigitSecondOnes < 9 && ++this.clockDigitSecondOnes;
        //         break;
        //     default:
        //         break;
        // }
    }
};

function getClockStringFromSeconds(totalSeconds) {
    let [hourStr, minStr, secStr] = ['', '', ''];
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

function getClockObjectFromSeconds(totalSeconds) {
    let [
        secondsOne,
        secondsTen,
        minutesOne,
        minutesTen,
        hoursOne,
        hoursTen
    ] = [0, 0, 0, 0, 0, 0];

    let remainder = totalSeconds;

    if (remainder >= ONE_HOUR_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_HOUR_IN_SECONDS);
        remainder %= ONE_HOUR_IN_SECONDS;

        if (quotient > 9) {
            const numString = String(quotient);
            hoursTen = Number(numString[0]);
            hoursOne = Number(numString[1]);
        } else {
            hoursOne = quotient;
        }
    }

    if (remainder >= ONE_MIN_IN_SECONDS) {
        const quotient = Math.floor(remainder / ONE_MIN_IN_SECONDS);
        remainder %= ONE_MIN_IN_SECONDS;
        
        if (quotient > 9) {
            const numString = String(quotient);
            minutesTen = Number(numString[0]);
            minutesOne = Number(numString[1]);
        } else {
            minutesOne = quotient;
        }
    }

    if (remainder >= 0) {
        if (remainder > 9) {
            const numString = String(remainder);
            secondsTen = Number(numString[0]);
            secondsOne = Number(numString[1]);
        } else {
            secondsOne = remainder;
        }
    }

    return {
        secondsOne,
        secondsTen,
        minutesOne,
        minutesTen,
        hoursOne,
        hoursTen
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

function makeIcon(name, size) {
    return new St.Icon({
        icon_type: St.IconType.SYMBOLIC,
        icon_name: name,
        icon_size: size,
        // style: "icon-size: 20px;",
        // style_class: 'popup-menu-icon' // this specifies the icon-size
    })
}

function makeButton(iconName) {
    const button = new St.Button({
        reactive: true,
        can_focus: true,
        track_hover: true,
        // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        style_class: "popup-menu-item",
        // style: "width: 20px; padding: 10px!important",
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

function makeClockDigit(text, name = null) {
    const label = new St.Label({
        text,
        style: "font-size: 20px;",
    });

    const bin = new St.Bin({
        name,
    });
    bin.set_child(label);

    return bin;
}

function main(metadata, orientation, panelHeight, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instanceId);
    return myApplet;
}