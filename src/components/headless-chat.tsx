import { useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const HeadlessChat = () => {
  const { agent } = useAgent();
  const [message, setMessage] = useState("");

  const sendMessage = useCallback(
    (message: string) => {
      agent.addMessage({
        role: "user",
        id: crypto.randomUUID(),
        content: message,
      });
      agent.runAgent();
      setMessage("");
    },
    [agent],
  );

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-base font-semibold">Chat</h1>
      {agent.messages.map((message) => (
        <p key={message.id} className="text-sm">
          {JSON.stringify(message.content)}
        </p>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(message);
        }}
      >
        <Input
          type="text"
          aria-label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};
