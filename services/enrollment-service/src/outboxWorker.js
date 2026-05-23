import { courseClient, callUnary } from "./grpcClients.js";

export function createOutboxWorker(enrollmentRepository) {
  async function processOneEvent(event) {
    const payload = event.payload;
    await callUnary(
      courseClient,
      "applyEnrollmentConfirmed",
      {
        event_id: event.event_id,
        enrollment_id: payload.enrollment_id,
        student_id: payload.student_id,
        course_id: payload.course_id
      },
      2000
    );
    await enrollmentRepository.markOutboxProcessed(event.event_id);
  }

  async function processOutbox() {
    const events = await enrollmentRepository.findPendingOutboxEvents({ limit: 10 });
    for (const event of events) {
      try {
        await processOneEvent(event);
        console.log(`Processed outbox event ${event.event_id}`);
      } catch (error) {
        await enrollmentRepository.markOutboxFailed(
          event.event_id,
          event.attempts,
          error.message
        );
        console.error(`Failed outbox event ${event.event_id}:`, error.message);
      }
    }
  }

  return {
    start() {
      setInterval(() => {
        processOutbox().catch((error) => {
          console.error("Outbox worker error:", error.message);
        });
      }, 3000);
      console.log("Outbox worker started (polling every 3s)");
    }
  };
}
