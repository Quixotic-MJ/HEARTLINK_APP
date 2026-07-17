import React, { createContext, useContext, useState } from "react";

type UserContextType = {
  userId: string;
  setUserId: (id: string) => void;
};

const UserContext = createContext<UserContextType>({
  userId: "usr-patient-101", // default for demo
  setUserId: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState("usr-patient-101");

  return (
    <UserContext.Provider value={{ userId, setUserId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
