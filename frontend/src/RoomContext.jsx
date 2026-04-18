import { createContext, useState } from 'react';

export const RoomContext = createContext();

export function RoomContextProvider({ children }) {
  const [roomInfo, setRoomInfo] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);

  return (
    <RoomContext.Provider value={{ roomInfo, setRoomInfo, roomMembers, setRoomMembers }}>
      {children}
    </RoomContext.Provider>
  );
}
