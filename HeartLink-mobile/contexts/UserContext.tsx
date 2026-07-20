import React, { createContext, useContext, useState, useEffect } from "react";

type UserContextType = {
  userId: string;
  setUserId: (id: string) => void;
  user: any;
};

const UserContext = createContext<UserContextType>({
  userId: "usr-patient-101", // default for demo
  setUserId: () => {},
  user: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState("usr-patient-101");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!userId) {
        setUser(null);
        return;
      }
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/profile`);
        if (response.ok) {
          const data = await response.json();
          setUser(data.profile);
        }
      } catch (err) {
        console.error("Failed to fetch user in context", err);
      }
    }
    fetchUser();
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, setUserId, user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
