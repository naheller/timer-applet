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
const ICON_SIZE = 20;

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
            this.timerDurationSec = 3728;
            this.timerValueSec = this.timerDurationSec;

            this.timerClockMenuItem = '';
            this.timerClockMenuItemSec = '';

            this.notificationSource = null;
            this.addNotificationSource();

            this.startButton = null;
            this.pauseButton = null;
            this.resetButton = null;

            this.startPauseButton = null;

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

    buildPopupMenu() {
        this.actor.add_style_class_name("timer");

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, this._orientation);

        // Timer clock
        const clockString = getClockStringFromSeconds(this.timerValueSec);
        this.timerClockMenuItem = new PopupMenu.PopupMenuItem(clockString);
        this.timerClockMenuItem.setSensitive(false);

        // Timer clock seconds (debug)
        this.timerClockMenuItemSec = new PopupMenu.PopupMenuItem(`${this.timerValueSec}`);
        this.timerClockMenuItemSec.setSensitive(false);

        // Timer clock seconds 2 (debug)
        const seconds = getSecondsFromClockString('1', '02', '08') // 3600 + 120 + 8 = 3728
        this.timerClockMenuItemSec = new PopupMenu.PopupMenuItem(`${this.timerValueSec}`);
        this.timerClockMenuItemSec.setSensitive(false);

        // Start button
        this.startButton = new PopupMenu.PopupIconMenuItem(BUTTON_LABEL_START, "weather-clear", St.IconType.SYMBOLIC);
        this.startButton.connect('activate', () => {
            this.startTimer();
            return true;
        });

        // Pause button
        this.pauseButton = new PopupMenu.PopupIconMenuItem(BUTTON_LABEL_PAUSE, "weather-overcast", St.IconType.SYMBOLIC);
        this.pauseButton.setSensitive(false);
        this.pauseButton.connect('activate', () => {
            this.pauseTimer();
            return true;
        });

        // Reset button
        this.resetButton = new PopupMenu.PopupIconMenuItem(BUTTON_LABEL_RESET, "weather-clear-night", St.IconType.SYMBOLIC);
        this.resetButton.setSensitive(false);
        this.resetButton.connect('activate', () => {
            this.resetTimer();
            return true;
        });

        // Add menu items
        this.menu.addMenuItem(this.timerClockMenuItem);
        this.menu.addMenuItem(this.timerClockMenuItemSec);
        this.menu.addMenuItem(this.startButton);
        this.menu.addMenuItem(this.pauseButton);
        this.menu.addMenuItem(this.resetButton);

        const menuSection = new PopupMenu.PopupMenuSection({ style_class: "popup-menu-section" });
        const controlBar = this.getControlBar();
        menuSection.actor.add_actor(controlBar);
        this.menu.addMenuItem(menuSection);

        this.menuManager.addMenu(this.menu);
    },

    getControlBar() {
        const iconStart = new St.Icon({
            icon_type: St.IconType.SYMBOLIC,
            icon_name: ICON_NAME_START,
            icon_size: ICON_SIZE,
            // style: "icon-size: 20px;",
            // style_class: 'popup-menu-icon' // this specifies the icon-size
        })

        const iconPause = new St.Icon({
            icon_type: St.IconType.SYMBOLIC,
            icon_name: ICON_NAME_PAUSE,
            style: "icon-size: 20px;",
            // style_class: 'popup-menu-icon' // this specifies the icon-size
        })

        // const buttonPlay = new St.Button({
        //     reactive: true,
        //     can_focus: true,
        //     // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        //     style_class: "popup-menu-item",
        //     // style: "width: 20px; padding: 10px!important",
        //     child: iconStart
        // })

        // const buttonPause = new St.Button({
        //     reactive: true,
        //     can_focus: true,
        //     // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
        //     style_class: "popup-menu-item",
        //     // style: "width: 20px; padding: 10px!important",
        //     child: iconPause
        // })

        this.startPauseButton = new St.Button({
            reactive: true,
            can_focus: true,
            // It is challenging to get a reasonable style on all themes. I have tried using the 'sound-player-overlay' class but didn't get it working. However might be possible anyway.  
            style_class: "popup-menu-item",
            // style: "width: 20px; padding: 10px!important",
            child: iconStart
        })

        this.startPauseButton.connect('clicked', () => {
            this.startTimer();
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
                if (this.timerValueSec > 0) {
                    this.tickTimer();
                } else {
                    this.showNotification(NOTIFICATION_MSG);
                    this.resetTimer();
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
        clearInterval(this.timerId);
        // this.timerValueSec = this.timerDurationSec;
        this.timerId = null;
        // this.timerClockMenuItem.label.text = `${this.timerDurationSec}`;
        // this.resetButton.setSensitive(false);
        // this.set_applet_label("");

        this.startPauseButton.child = null;

        this.startButton.setSensitive(true);
        this.startButton.label.text = BUTTON_LABEL_RESUME;
    },

    resetTimer() {
        clearInterval(this.timerId);
        this.timerValueSec = this.timerDurationSec;
        this.timerId = null;

        this.updateClockText();
        this.startButton.label.text = BUTTON_LABEL_START;

        this.resetButton.setSensitive(false);
        this.pauseButton.setSensitive(false);
        this.startButton.setSensitive(true);
        // this.set_applet_label("");
    },

    tickTimer() {
        --this.timerValueSec;
        this.updateClockText();
        // this.set_applet_label(`${this.timerValueSec}`);
    },

    updateClockText() {
        const clockString = getClockStringFromSeconds(this.timerValueSec);
        this.timerClockMenuItem.label.text = clockString;
        this.timerClockMenuItemSec.label.text = `${this.timerValueSec}`;
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

function main(metadata, orientation, panelHeight, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instanceId);
    return myApplet;
}