import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = createDDbDocClient();  
const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    
    const movieIdStr = event.pathParameters?.movieId;
    if (!movieIdStr || Number.isNaN(Number(movieIdStr))) {
      return json(400, { message: "movieId path param must be a number" });
    }
    const movieId = Number(movieIdStr);

      /* ---------- 2. 验证 query 参数 role（Part A 必须提供） ---------- */
      const role = event.queryStringParameters?.role;
      if (!role) {
        return json(400, { message: "Query string ?role=missing" });
      }
  
      /* ---------- 3. 查询 DynamoDB（分区键 + 排序键） ---------- */
      const { Items } = await ddb.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME!,
          KeyConditionExpression: "#mid = :mid AND #r = :r",
          ExpressionAttributeNames: {
            "#mid": "movieId",
            "#r": "role",
          },
          ExpressionAttributeValues: {
            ":mid": movieId,
            ":r": role,
          },
          Limit: 1,
        })
      );
  
      if (!Items || Items.length === 0) {
        return json(404, { message: "Crew member not found" });
      }
  
      return json(200, Items[0]);  // 只返回单个对象
    } catch (error) {
      console.error(error);
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
