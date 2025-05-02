import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const ddb = createDDbDocClient();  

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    
    const movieIdStr = event.pathParameters?.movieId;
    if (!movieIdStr || Number.isNaN(Number(movieIdStr))) {
      return json(400, { message: "movieId path param must be a number" });
    }
    const movieId = Number(movieIdStr);
      
      const role = event.queryStringParameters?.role;
      const params: QueryCommandInput = role
      ? {
          TableName: process.env.TABLE_NAME!,
          KeyConditionExpression: "#mid = :mid AND #r = :r",
          ExpressionAttributeNames: { "#mid": "movieId", "#r": "role" },
          ExpressionAttributeValues: { ":mid": movieId, ":r": role },
          Limit: 1,
        }
      : {
          TableName: process.env.TABLE_NAME!,
          KeyConditionExpression: "#mid = :mid",
          ExpressionAttributeNames: { "#mid": "movieId" },
          ExpressionAttributeValues: { ":mid": movieId },
        };
  
        const { Items } = await ddb.send(new QueryCommand(params));

        if (!Items || Items.length === 0) {
          return json(404, { message: "No crew data found" });
        }

        return json(200, role ? Items[0] : Items);
      } catch (err) {
        console.error(err);
        return json(500, { message: "Internal server error" });
      }
    };
  

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
