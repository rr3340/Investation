// An event bus implementation for communicating between different components.

class EventBus {
  constructor() {
    this.events = {};
  }

  // This subscribes to an event, the event being what name it is and callback when to execute.
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  //Same process. It unsubscribes.
  unsubscribe(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  // Event + data to pass to subs
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus(); 