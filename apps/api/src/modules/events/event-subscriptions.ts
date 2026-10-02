import { incidentOpenedConsumer } from "@api/modules/incidents/events/incident-opened.consumer"
import { incidentUpdatedConsumer } from "@api/modules/incidents/events/incident-updated.consumer"
import { eventBusService } from "./services/event-bus.service"

// Consumer ids are part of job names and ids; keep them stable.
export function registerEventSubscriptions() {
  eventBusService.subscribe(
    "incident.opened",
    "notify-destinations",
    incidentOpenedConsumer.process
  )
  eventBusService.subscribe(
    "incident.updated",
    "update-destinations",
    incidentUpdatedConsumer.process
  )
}
