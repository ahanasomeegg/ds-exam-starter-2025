import { Handler, SNSHandler } from "aws-lambda";
import {
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: process.env.REGION });
const QUEUE_URL = process.env.QUEUE_B_URL!;

export const handler: Handler = async (event) => {
  for (const record of event.Records) {
    const msgStr = record.Sns.Message;
    let msg: any;

    try {
      msg = JSON.parse(msgStr);
    } catch {
      console.warn("Skip non-JSON message:", msgStr);
      continue;
    }

    // send messages missing an email property
    if (!msg.email) {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: msgStr,
        })
      );
      console.log("Pushed to Queue B:", msgStr);
    } else {
      console.log("Email present, ignore:", msgStr);
    }
  }
};
