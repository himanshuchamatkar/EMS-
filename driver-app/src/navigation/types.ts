import type { Emergency } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Navigation: { emergency: Emergency };
};
