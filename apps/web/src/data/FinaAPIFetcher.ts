import supabase from "@/supabaseClient";
import axios, { AxiosResponse } from "axios";

export interface FinaAPIFetcherParams {
  url: string;
  options: RequestInit;
}

export class FinaAPIFetcher {
  static async get<T>(
    path: string,
    params: Record<string, unknown>
  ): Promise<AxiosResponse<T>> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = new URL(path, import.meta.env.VITE_API_URL).toString();

      return axios.get<T>(url, {
        params,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  static async patch<T>(
    path: string,
    data: Record<string, unknown>
  ): Promise<AxiosResponse<T>> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = new URL(path, import.meta.env.VITE_API_URL).toString();

      return axios.patch<T>(url, data, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  static async post<T>(
    path: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<AxiosResponse<T>> {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    const url = new URL(path, import.meta.env.VITE_API_URL).toString();

    return axios.post<T>(url, data, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  }

  static async delete<T>(path: string): Promise<AxiosResponse<T>> {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    const url = new URL(path, import.meta.env.VITE_API_URL).toString();

    return axios.delete<T>(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  }
}
