import type {
  MoneyAccount,
  MoneyBudget,
  MoneyCard,
  MoneyCategory,
  MoneyFinancing,
  MoneyRecurrence,
  MoneyTransaction,
} from "@/lib/money/data";

export type MoneyDataSnapshot = {
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  cards: MoneyCard[];
  budgets: MoneyBudget[];
  recurrences: MoneyRecurrence[];
  financings: MoneyFinancing[];
  primaryCurrency: string;
};

export type OfflineTransactionPayload = {
  id: string;
  user_id: string;
  kind: "income" | "expense" | "transfer";
  account_id: string;
  card_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  recurrence_id: null;
  refund_of_id: null;
  transfer_group_id: string | null;
  amount: number;
  destination_amount: number | null;
  exchange_rate: number | null;
  voucher_count: number | null;
  transaction_date: string;
  due_date: null;
  confirmed_at: string;
  accounted_at: string | null;
  notes: string | null;
};

export type OfflineQueueItem = {
  id: string;
  userId: string;
  createdAt: string;
  payload: OfflineTransactionPayload;
};

const DB_NAME = "money-elite-offline-v1";
const DB_VERSION = 1;
const SNAPSHOTS = "snapshots";
const QUEUE = "transaction-queue";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOTS))
        database.createObjectStore(SNAPSHOTS, { keyPath: "userId" });
      if (!database.objectStoreNames.contains(QUEUE)) {
        const store = database.createObjectStore(QUEUE, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSnapshot(
  userId: string,
  data: MoneyDataSnapshot,
) {
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readwrite");
  await requestResult(
    transaction.objectStore(SNAPSHOTS).put({ userId, savedAt: Date.now(), data }),
  );
  database.close();
}

export async function loadOfflineSnapshot(userId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readonly");
  const result = await requestResult<
    { userId: string; savedAt: number; data: MoneyDataSnapshot } | undefined
  >(transaction.objectStore(SNAPSHOTS).get(userId));
  database.close();
  return result ?? null;
}

export async function enqueueOfflineTransaction(item: OfflineQueueItem) {
  const database = await openDatabase();
  const transaction = database.transaction(QUEUE, "readwrite");
  await requestResult(transaction.objectStore(QUEUE).put(item));
  database.close();
}

export async function listOfflineTransactions(userId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(QUEUE, "readonly");
  const result = await requestResult<OfflineQueueItem[]>(
    transaction.objectStore(QUEUE).index("userId").getAll(userId),
  );
  database.close();
  return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOfflineTransaction(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(QUEUE, "readwrite");
  await requestResult(transaction.objectStore(QUEUE).delete(id));
  database.close();
}
