import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  currentUser: string;
  setCurrentUser: (name: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: '',
      setCurrentUser: (name) => set({ currentUser: name }),
    }),
    { name: 'team-dashboard-user' },
  ),
);
