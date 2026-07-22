import { cssInterop } from "nativewind";
import { Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

cssInterop(Feather, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
    },
  },
});

cssInterop(MaterialIcons, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
    },
  },
});

cssInterop(MaterialCommunityIcons, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
    },
  },
});

export { Feather, MaterialIcons, MaterialCommunityIcons };
