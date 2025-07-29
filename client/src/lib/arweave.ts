import Arweave from 'arweave';

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

export class ArweaveService {
  private static instance: ArweaveService;

  static getInstance(): ArweaveService {
    if (!ArweaveService.instance) {
      ArweaveService.instance = new ArweaveService();
    }
    return ArweaveService.instance;
  }

  async uploadDocument(
    data: any,
    tags: Array<{ name: string; value: string }>
  ): Promise<{ id: string; url: string }> {
    try {
      const transaction = await arweave.createTransaction({
        data: JSON.stringify(data),
      });

      tags.forEach((tag) => {
        transaction.addTag(tag.name, tag.value);
      });

      transaction.addTag('App-Name', 'SecureContract');
      transaction.addTag('Content-Type', 'application/json');

      await arweave.transactions.sign(transaction);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        return {
          id: transaction.id,
          url: `https://arweave.net/${transaction.id}`,
        };
      } else {
        throw new Error('Failed to upload to Arweave');
      }
    } catch (error) {
      console.error('Arweave upload error:', error);
      throw error;
    }
  }

  async getDocument(transactionId: string): Promise<any> {
    try {
      const response = await arweave.transactions.getData(transactionId, {
        decode: true,
        string: true,
      });
      return JSON.parse(response as string);
    } catch (error) {
      console.error('Arweave fetch error:', error);
      throw error;
    }
  }

  async verifyTransaction(transactionId: string): Promise<boolean> {
    try {
      const status = await arweave.transactions.getStatus(transactionId);
      return status.status === 200;
    } catch (error) {
      return false;
    }
  }
}