// PreferencesStore.js

class PreferencesStore {
  constructor() {
    this.STORAGE_KEY = "mint:user-preferences";

    this.defaults = {
      appearance: {
        theme: "dark"
      },
      notifications: {
        enabled: true
      },
      media: {
        volume: 0.8,
        autoplay: false
      }
    };

    this.state = {};
    this.listeners = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.state = raw
        ? this._merge(structuredClone(this.defaults), JSON.parse(raw))
        : structuredClone(this.defaults);
    } catch (e) {
      console.warn("[PreferencesStore] Failed to load prefs, using defaults");
      this.state = structuredClone(this.defaults);
    }
    this._emit();
  }

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  get(path) {
    return path.split(".").reduce((o, k) => o?.[k], this.state);
  }

  set(path, value) {
    const keys = path.split(".");
    let ref = this.state;

    while (keys.length > 1) {
      const k = keys.shift();
      ref[k] ??= {};
      ref = ref[k];
    }

    ref[keys[0]] = value;
    this.save();
    this._emit(path, value);
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  _emit(path = null, value = null) {
    for (const cb of this.listeners) {
      cb(this.state, path, value);
    }
  }

  _merge(target, source) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        target[key] = this._merge(target[key] ?? {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}

export const Preferences = new PreferencesStore();
