import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type MainTabParamList = {
  Incident: undefined;
  Status: undefined;
  History: undefined;
  Map: undefined;
};
