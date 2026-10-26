// ==============================================================================
// FY IT Task Manager - Push Notification Service
// Native Web Notification API with Audio Bell & Realtime Alerts
// ==============================================================================

class PushNotificationService {
  constructor() {
    this.storageKey = 'fy_push_notifications_enabled';
    this.soundKey = 'fy_notification_sound_enabled';
  }

  // Check if browser supports Web Notifications
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Current permission: 'default' | 'granted' | 'denied'
  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Check if user has explicitly granted & enabled notifications
  isEnabled() {
    if (!this.isSupported()) return false;
    const userPref = localStorage.getItem(this.storageKey);
    return Notification.permission === 'granted' && userPref !== 'false';
  }

  // Play gentle notification chime via Web Audio API (Zero external assets needed)
  playChime(type = 'default') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'pomodoro') {
        // High-pitched pleasant dual chime
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        // Soft chime for new tasks & announcements
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      // AudioContext might be blocked until user gesture, ignore silently
      console.warn('Audio chime notice:', e);
    }
  }

  // Request user permission for Push Notifications
  async requestPermission() {
    if (!this.isSupported()) {
      return { success: false, reason: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem(this.storageKey, 'true');
        this.playChime('default');

        // Immediate test push notification to confirm
        this.sendNotification('🔔 Push Notifications Activated!', {
          body: 'You will now receive instant desktop alerts for FY B.Sc. IT assignments, study timers, and deadlines.',
          tag: 'fy_welcome_push',
        });

        return { success: true, permission };
      } else {
        localStorage.setItem(this.storageKey, 'false');
        return { success: false, permission };
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { success: false, error };
    }
  }

  // Disable push notifications
  disable() {
    localStorage.setItem(this.storageKey, 'false');
  }

  // Send a native push notification
  sendNotification(title, options = {}) {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    if (localStorage.getItem(this.storageKey) === 'false') return false;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options,
      });

      // Play audio chime
      this.playChime(options.soundType || 'default');

      // Click to focus window
      notification.onclick = function () {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };

      return true;
    } catch (e) {
      console.error('Failed to trigger native notification:', e);
      return false;
    }
  }

  // Notify new task assigned
  notifyTaskAssigned(task) {
    return this.sendNotification('📚 New Task Assigned!', {
      body: `${task.title} (${task.subject_name || 'FY IT'}) - Due: ${task.due_date || 'Soon'}`,
      tag: `task-${task.id}`,
      url: '/tasks',
    });
  }

  // Notify Pomodoro finished
  notifyPomodoroFinished(taskTitle = 'Study Session') {
    return this.sendNotification('⏱️ Pomodoro Completed!', {
      body: `Great job on: "${taskTitle}". Take a 5-minute break now!`,
      tag: 'pomodoro_complete',
      soundType: 'pomodoro',
    });
  }

  // Notify Daily To-Do Reminder
  notifyTodoDue(todo) {
    return this.sendNotification('🎯 Daily To-Do Reminder', {
      body: `Don't forget: "${todo.title}" is scheduled for today!`,
      tag: `todo-${todo.id}`,
      url: '/todos',
    });
  }
}

export const pushService = new PushNotificationService();
