import Config from "react-native-config";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "~/reducers";
import Rectotron from "~/ReactotronConfig";
import { rebootMiddleware } from "~/middleware/rebootMiddleware";

export const store = configureStore({
  reducer: reducers,
  devTools: !!Config.DEBUG_RNDEBUGGER,
  middleware: getDefaultMiddleware => {
    // TODO revisit this
    const defaultMiddleware = getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    });
    return defaultMiddleware.concat(rebootMiddleware);
  },
  ...(__DEV__ && {
    enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(Rectotron.createEnhancer()),
  }),
});

export type StoreType = typeof store;
