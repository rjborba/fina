import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { TRow } from "../pages";
import {
  query as firebaseQuery,
  orderBy,
  startAt,
  getDocs,
} from "firebase/firestore";
import { useEntries } from "../context/entriesContext";

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

const upsert = (row: TRow) => {
  return addDoc(collection(db, "entries"), {
    description: row.description,
    date: Timestamp.fromDate(row.date),
    category: row.category,
    value: row.value,
  });
};

const remove = () => {
  throw new Error("To be implemented");
};

const query = async (): Promise<TRow[]> => {
  const entriesRef = collection(db, "entries");
  const res = await getDocs(firebaseQuery(entriesRef));

  return res.docs.map((snapshot) => {
    const snapshotData = snapshot.data();
    return { ...snapshotData, date: snapshotData.date.toDate() } as TRow;
  });
};

export const useDb = () => {
  return { upsert, remove, query };
};
