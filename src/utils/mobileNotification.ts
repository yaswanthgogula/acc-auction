/**
 * ============================================================================
 * ACC MOBILE & DESKTOP NATIVE PUSH NOTIFICATION UTILITY
 * ============================================================================
 */

class MobileNotificationService {
  private permission: NotificationPermission = 'default';
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
      this.initServiceWorker();
    }
  }

  private async initServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = reg;
      } catch (err) {
        console.warn('Service worker registration failed:', err);
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      this.permission = perm;
      if (perm === 'granted') {
        this.sendNotification(
          '🏏 Mobile Alerts Activated!',
          'You will now receive broadcast notices directly on your mobile device even when not actively using the app.'
        );
      }
      return perm;
    } catch {
      return 'denied';
    }
  }

  public async sendNotification(title: string, body: string, options?: NotificationOptions) {
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') return;

    try {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([300, 150, 300, 150, 400]);
        } catch {}
      }

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'acc-auction-alert',
              requireInteraction: true,
              ...options,
            });
            return;
          }
        } catch {}
      }

      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'acc-auction-alert',
        requireInteraction: true,
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Native notification display error:', e);
    }
  }
}

export const mobileNotification = new MobileNotificationService();
