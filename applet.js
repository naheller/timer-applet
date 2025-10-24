const Lang = imports.lang;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
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

            this.timerClockMenuItem = '';
            this.timerClockMenuItemSec = '';

            this.clockDigitSecondOnes = 8;

            this.notificationSource = null;
            this.addNotificationSource();
            
            this.startPauseButton = null;
            this.resetButton = null;

            this.buildPopupMenu();
            // this.buildBoxLayout();
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
        
        const controlBar = this.getControlBar();
        const clock = this.getClock();
        
        menuSection.actor.add_actor(controlBar);
        menuSection.actor.add_actor(clock);
        
        this.menu.addMenuItem(menuSection);

        this.menuManager.addMenu(this.menu);
    },

    getClock() {
        const {
            secondOnes,
            colon
        } = this.getClockElements();

        const clockBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER
        });

        clockBox.add_child(secondOnes);
        clockBox.add_child(colon);

        return clockBox;
    },

    getClockElements() {
        const iconIncrement = makeIcon(ICON_NAME_INCR, ICON_SIZE_SM);
        const iconDecrement = makeIcon(ICON_NAME_DECR, ICON_SIZE_SM);

        const incrementButton = makeButton(iconIncrement);
        // incrementButton.setSensitive(false);
        const decrementButton = makeButton(iconDecrement);

        this.secondOnesDigit = makeClockDigit('8');
        const colon = makeClockDigit(':');

        const secondOnes = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        secondOnes.add_child(incrementButton);
        secondOnes.add_child(this.secondOnesDigit);
        secondOnes.add_child(decrementButton);

        return {
            secondOnes,
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

        const toolbar = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER
        });

        toolbar.add_child(this.startPauseButton);
        toolbar.add_child(this.resetButton);

        return toolbar;
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

    incrementDigit(digitType) {
        if (this[digitType] < 9) {
            ++this[digitType];
            // this.clockDigitSecondOnesLabel.get_child().set_text(`${this[digitType]}`)
            // TODO: Idea is that numerical digit is this[digitType] (ex: this.clockDigitSecondOnes),
            // and there is an assoc label string like this.clockDigitSecondOnesLabel that we update.
        }
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

function makeClockDigit(text) {
    const label = new St.Label({
        text,
        style: "font-size: 20px;",
    });

    const bin = new St.Bin();
    bin.set_child(label);

    return bin;
}

function main(metadata, orientation, panelHeight, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instanceId);
    return myApplet;
}