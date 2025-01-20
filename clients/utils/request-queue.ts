/**
 * Utility class for rate-limiting and queuing requests
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>>;
  private processing: boolean;

  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Adds a request to the queue
   * @param request - Async function to execute
   * @returns Promise resolving to the request result
   */
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Processes queued requests with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        try {
          await request();
          await this.delay(1000); // Rate limiting delay
        } catch (error) {
          console.error("Error processing request:", error);
          await this.delay(2000); // Backoff on error
        }
      }
    }
    this.processing = false;
  }

  /**
   * Utility delay function
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
