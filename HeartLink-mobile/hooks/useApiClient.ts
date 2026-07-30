import { useToast } from "../contexts/ToastContext";
import { useUser } from "../contexts/UserContext";

export function useApiClient() {
  const { showToast } = useToast();
  const { logout } = useUser();

  const fetchAPI = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const response = await fetch(input, init);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showToast({
            title: "Session Expired",
            message: "Please log in again.",
            type: "error",
          });
          await logout();
        } else if (response.status >= 500) {
          showToast({
            title: "Server Error",
            message: "Something went wrong on our end. Please try again later.",
            type: "error",
          });
        }
      }
      return response;
    } catch (error) {
      showToast({
        title: "Network Error",
        message: "Please check your connection and try again.",
        type: "error",
      });
      throw error;
    }
  };

  return { fetchAPI };
}
