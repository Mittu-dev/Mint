import { Preferences } from "./SystemPreferences.js";

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.enabled = true;
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  _emit() {
    this.listeners.forEach(cb => cb(this.notifications));
  }

  addNotification(message, type = "info") {
    if (!this.enabled) return null;

    const notification = {
      id: crypto.randomUUID(),
      message,
      type,
      read: false,
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this._emit();
    return notification;
  }

  markAsRead(id) {
    const n = this.notifications.find(n => n.id === id);
    if (n) {
      n.read = true;
      this._emit();
      return true;
    }
    return false;
  }

  removeNotification(id) {
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.notifications.splice(idx, 1);
      this._emit();
      return true;
    }
    return false;
  }

  getNotifications(filter = {}) {
    return this.notifications.filter(n =>
      Object.entries(filter).every(([k, v]) => n[k] === v)
    );
  }
}

class NotificationUI {
  constructor(service) {
    this.service = service;
    this.container = document.createElement("div");
    this.container.className = "notification-container";
    document.body.appendChild(this.container);

    this.service.onChange(() => this.render());
  }

  render() {
    this.container.innerHTML = "";

    this.service.getNotifications().forEach(notification => {
      const el = document.createElement("div");
      el.className = `notification ${notification.type} ${notification.read ? "read" : "unread"}`;
      el.textContent = notification.message;

      const readBtn = document.createElement("button");
      readBtn.textContent = "Read";
      readBtn.onclick = () => this.service.markAsRead(notification.id);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.onclick = () => this.service.removeNotification(notification.id);

      el.append(readBtn, removeBtn);
      this.container.appendChild(el);
    });
  }
}

class NotificationManager {
  constructor() {
    this.service = new NotificationService();
    this.ui = new NotificationUI(this.service);

    Preferences.onChange((state, path) => {
      if (path === "notifications.enabled") {
        this.service.enabled = state.notifications.enabled;
      }
    });

    // estado inicial
    this.service.enabled = Preferences.get("notifications.enabled");
  }

  notify(message, type = "info") {
    this.service.addNotification(message, type);
  }
}

export { NotificationManager };

//Usage Example:
// const notificationManager = new NotificationManager();
// notificationManager.notify('Welcome to MintShell!', 'info');
// notificationManager.notify('You have a new message.', 'message');
// notificationManager.notify('System error occurred!', 'error');