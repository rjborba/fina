import dayjs from "dayjs";
import { initializeApp } from "firebase/app";
import {
  deleteDoc,
  doc,
  DocumentReference,
  getFirestore,
  where,
} from "firebase/firestore";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import {
  query as firebaseQuery,
  orderBy,
  startAt,
  getDocs,
} from "firebase/firestore";
import { TCreateEntryDTO, TEntry } from "../types/Entry";

const firebaseConfig = {
  apiKey: "AIzaSyBe82SjUa_iEoR3a7yaagOmWqqbBTI7C74",
  authDomain: "finn-b0b55.firebaseapp.com",
  projectId: "finn-b0b55",
  storageBucket: "finn-b0b55.appspot.com",
  messagingSenderId: "1068095681988",
  appId: "1:1068095681988:web:3d13b2b211485dea2b6091",
  measurementId: "G-4TGHZ19SHD",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const upsert = (newEntry: TCreateEntryDTO): Promise<TEntry> => {
  const normalizedEntry = {
    description: newEntry.description,
    date: Timestamp.fromDate(newEntry.date),
    category: newEntry.category,
    value: newEntry.value,
  };

  return addDoc(collection(db, "entries"), normalizedEntry).then(
    (insertedEntry) => ({ ...newEntry, id: insertedEntry.id } as TEntry)
  );
};

const remove = (id: TEntry["id"]) => {
  return deleteDoc(doc(db, "entries", id));
};

type tQueryOptions = { month?: number };
const query = async (options?: tQueryOptions): Promise<TEntry[]> => {
  const entriesRef = collection(db, "entries");

  let queryToBeUsed;
  if (options?.month) {
    let monthDate = dayjs();
    monthDate = monthDate.set("month", options.month);
    const firstDayOfMonth = monthDate.startOf("month");
    const lastDayOfMonth = monthDate.endOf("month");

    queryToBeUsed = firebaseQuery(
      entriesRef,
      where("date", ">=", Timestamp.fromDate(firstDayOfMonth.toDate())),
      where("date", "<=", Timestamp.fromDate(lastDayOfMonth.toDate())),
      orderBy("date", "desc")
    );
  } else {
    queryToBeUsed = firebaseQuery(entriesRef, orderBy("date", "desc"));
  }

  const res = await getDocs(queryToBeUsed);

  return res.docs.map((snapshot) => {
    const snapshotData = snapshot.data();
    return {
      ...snapshotData,
      date: snapshotData.date.toDate(),
      id: snapshot.id,
    } as TEntry;
  });
};

export const useDb = () => {
  return { upsert, remove, query };
};
