import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Platform } from "react-native";
import { useEffect, useState } from "react";
import { api, Gift, Table } from "../../services/api";

const showError = (message: string) => {
  if (Platform.OS === "web") {
    window.alert(`Error: ${message}`);
  } else {
    Alert.alert("Error", message);
  }
};

const showMessage = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}: ${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [idInput, setIdInput] = useState("");
  const [loginMode, setLoginMode] = useState<"create" | "login">("create");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStudying, setIsStudying] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [coins, setCoins] = useState(0);
  const [giftUserId, setGiftUserId] = useState("");
  const [giftType, setGiftType] = useState("coffee");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [lastSeenGiftCount, setLastSeenGiftCount] = useState(0);
  const hasNewGifts = gifts.length > lastSeenGiftCount;
  const markGiftsAsSeen = () => setLastSeenGiftCount(gifts.length);

  const fetchTables = async () => {
    try {
      const data = await api.getTables();
      setTables(data);
    } catch (err) {
      showError("Failed to fetch tables");
    }
  };

  const refreshUserSession = async (uid: number) => {
    try {
      const user = await api.getUser(uid);
      setIsStudying(user.is_studying);
      setCoins(user.coins);

      const sessions = await api.getActiveSessions();
      const mySession = Array.isArray(sessions)
        ? sessions.find(s => s.user_id === uid)
        : null;
      setSessionId(mySession ? mySession.session_id : null);
    } catch (err) {
      showError("Failed to fetch user/session info");
    }
  };

  const fetchGifts = async (uid: number) => {
    try {
      const data = await api.getReceivedGifts(uid);
      setGifts(data);
    } catch (err: any) {
      showError("Failed to fetch gifts");
    }
  };

  const refreshAll = async (uid: number, isInitial = false) => {
    if (actionLoading) return;
    if (isInitial) setLoading(true);
    await fetchTables();
    await refreshUserSession(uid);
    await fetchGifts(uid);
    if (isInitial) setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    refreshAll(userId, true);
    const interval = setInterval(() => refreshAll(userId, false), 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleCreateAccount = async () => {
    if (!nameInput.trim()) {
      showError("Please enter your name.");
      return;
    }
    setCreatingAccount(true);
    try {
      const user = await api.createUser(nameInput.trim());
      setUserId(user.id);
    } catch (err: any) {
      showError(err.message || "Failed to create account");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleLogin = async () => {
    const id = Number(idInput);
    if (!id) {
      showError("Please enter a valid user ID.");
      return;
    }
    setCreatingAccount(true);
    try {
      await api.getUser(id);
      setUserId(id);
    } catch (err: any) {
      showError("User not found.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const startSession = async (tableId: number) => {
    if (!userId) return;
    if (isStudying) {
      showMessage("Already studying", "You have an active session.");
      return;
    }
    setActionLoading(true);
    setIsStudying(true);
    setTables(prev => prev.map(t => t.table_id === tableId ? { ...t, occupied: true } : t));
    try {
      const data = await api.startSession(userId, tableId);
      setSessionId(data.session_id);
      await refreshAll(userId);
    } catch (err: any) {
      showError(err.message || "Failed to start session");
      setIsStudying(false);
      await fetchTables();
    } finally {
      setActionLoading(false);
    }
  };

  const endSession = async () => {
    if (!sessionId || !userId) return;
    setActionLoading(true);
    setIsStudying(false);
    try {
      await api.endSession(sessionId);
      await refreshAll(userId);
    } catch (err: any) {
      showError(err.message);
      setIsStudying(true);
      await fetchTables();
    } finally {
      setActionLoading(false);
    }
  };

  const sendGift = async () => {
    if (!userId) return;
    if (!giftUserId || !giftType) {
      showError("Please enter recipient and gift type.");
      return;
    }
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.sendGift({
        from_user_id: userId,
        to_user_id: Number(giftUserId),
        gift_type: giftType,
      });
      setGiftUserId("");
      setGiftType("");
      await fetchGifts(userId);
      await refreshUserSession(userId);
      showMessage("Gift sent!", `You sent a ${giftType}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Corner Table</Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, loginMode === "create" && styles.modeButtonActive]}
            onPress={() => setLoginMode("create")}
          >
            <Text style={[styles.modeButtonText, loginMode === "create" && styles.modeButtonTextActive]}>
              New account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, loginMode === "login" && styles.modeButtonActive]}
            onPress={() => setLoginMode("login")}
          >
            <Text style={[styles.modeButtonText, loginMode === "login" && styles.modeButtonTextActive]}>
              Log in
            </Text>
          </TouchableOpacity>
        </View>

        {loginMode === "create" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateAccount}
              disabled={creatingAccount}
            >
              <Text style={styles.primaryButtonText}>
                {creatingAccount ? "Creating..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your user ID"
              keyboardType="numeric"
              value={idInput}
              onChangeText={setIdInput}
              autoFocus
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={creatingAccount}
            >
              <Text style={styles.primaryButtonText}>
                {creatingAccount ? "Logging in..." : "Log In"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Corner Table</Text>
      <View style={styles.topBar}>
        <Text style={styles.coins}>🪙 {coins} coins · User {userId}</Text>
        <TouchableOpacity onPress={() => setUserId(null)}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {tables.map((table) => (
          <TouchableOpacity
            key={table.table_id}
            disabled={table.occupied || isStudying || actionLoading}
            onPress={() => startSession(table.table_id)}
          >
            <View style={[styles.table, table.occupied ? styles.occupied : styles.free]}>
              <Text style={styles.tableText}>{table.table_id}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {isStudying && (
        <TouchableOpacity style={styles.endButton} onPress={endSession} disabled={actionLoading}>
          <Text style={styles.endButtonText}>End Session</Text>
        </TouchableOpacity>
      )}

      <View style={styles.giftBox}>
        <Text style={styles.giftTitle}>Send a gift</Text>
        <TextInput
          style={styles.input}
          placeholder="Recipient user ID"
          keyboardType="numeric"
          value={giftUserId}
          onChangeText={setGiftUserId}
        />
        <TextInput
          style={styles.input}
          placeholder="Gift type (e.g. coffee)"
          value={giftType}
          onChangeText={setGiftType}
        />
        <TouchableOpacity style={styles.giftButton} onPress={sendGift}>
          <Text style={styles.giftButtonText}>Send Gift (5 coins)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.giftHeader}>
        <Text style={styles.giftTitle}>Received gifts</Text>
        {hasNewGifts && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={markGiftsAsSeen}>
        <View style={styles.giftBox}>
          {!Array.isArray(gifts) || gifts.length === 0 ? (
            <Text style={styles.empty}>No gifts yet</Text>
          ) : (
            gifts.slice().reverse().map((g, i) => (
              <Text key={i} style={styles.giftItem}>
                {g.gift_type} from User {g.from_user_id}
              </Text>
            ))
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  coins: {
    fontSize: 16,
    color: "#374151",
  },
  logoutText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  table: {
    width: 72,
    height: 72,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  free: {
    backgroundColor: "#4ade80",
  },
  occupied: {
    backgroundColor: "#f87171",
  },
  tableText: {
    fontSize: 16,
    fontWeight: "500",
  },
  endButton: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
  },
  endButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  giftBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  giftTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#fff",
  },
  modeButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  modeButtonTextActive: {
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  giftButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
  },
  giftButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  giftItem: {
    fontSize: 14,
    marginTop: 4,
  },
  empty: {
    fontSize: 14,
    color: "#9ca3af",
  },
  giftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  newBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
