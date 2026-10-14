/**
 * Renders a `Notice` (see ../lib/paymentErrors.ts): the message, plus an action
 * button (Upgrade / Update payment) when the notice carries a link.
 */
import { Alert, Button } from "@mui/material";
import type { Notice } from "../lib/paymentErrors";

export function NoticeAlert({
  notice,
  severity = "error",
  onClose,
  "data-cy": dataCy,
}: {
  notice: Notice;
  severity?: "error" | "warning";
  onClose?: () => void;
  "data-cy"?: string;
}) {
  return (
    <Alert
      severity={severity}
      onClose={onClose}
      data-cy={dataCy}
      action={
        notice.actionUrl ? (
          <Button color="inherit" size="small" href={notice.actionUrl} data-cy="notice-action">
            {notice.actionLabel ?? "Open"}
          </Button>
        ) : undefined
      }
    >
      {notice.message}
    </Alert>
  );
}
