declare module "@alicloud/mns" {
  type MnsClientOptions = {
    region?: string;
    endpoint?: string;
    accessKeyId: string;
    accessKeySecret: string;
    securityToken?: string;
    secure?: boolean;
    internal?: boolean;
    vpc?: boolean;
    readTimeout?: number;
    connectTimeout?: number;
    refreshSTSToken?: () => Promise<{
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
    }>;
    refreshSTSTokenInterval?: number;
  };

  type MnsResponse = {
    code: number;
    headers: Record<string, string>;
    body?: Record<string, unknown>;
  };

  export default class MNSClient {
    constructor(accountId: string, options: MnsClientOptions);
    sendMessage(
      queueName: string,
      params: { MessageBody: string; DelaySeconds?: number; Priority?: number },
    ): Promise<MnsResponse>;
    receiveMessage(
      queueName: string,
      waitSeconds?: number,
    ): Promise<MnsResponse>;
    deleteMessage(
      queueName: string,
      receiptHandle: string,
    ): Promise<MnsResponse>;
    changeMessageVisibility(
      queueName: string,
      receiptHandle: string,
      visibilityTimeout: number,
    ): Promise<MnsResponse>;
  }
}
