import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { api, Gift, Table } from "../../services/api";

const API_URL = __DEV__
? "http://172.20.10.11:8000"
: "https://your-api.com";

const showError = (message: string) =>
  Alert.alert("Error", message);

export default function HomeScreen() {
  const [userId, setUserId] = useState(1);
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
  const markGiftsAsSeen = () => {
    setLastSeenGiftCount(gifts.length);
  };




  // Fetch tables from backend
  const fetchTables = async () => {
    try {
      const data = await api.getTables();
      setTables(data);
    } catch (err) {
      showError("Failed to fetch tables");
    }
  };

  const refreshUserSession = async () => {
  try {
    const user = await api.getUser(userId);
    setIsStudying(user.is_studying);
    setCoins(user.coins);

    const sessions = await api.getActiveSessions();
    console.log("sessions:", sessions);
    const mySession = Array.isArray(sessions)
  ? sessions.find(s => s.user_id === userId)
  : null;

    // const mySession = sessions.find(s=> s.user_id === userId);
    setSessionId(mySession ? mySession.session_id : null);
  } catch (err) {
    showError("Failed to fetch user/session info");
  }
};

  // Combined refresh
  const refreshAll = async (isInitial = false) => {
    if (actionLoading) return;

    if (isInitial) setLoading(true);

    await fetchTables();
    await refreshUserSession();
    await fetchGifts();

    if (isInitial) setLoading(false);
  };


  // Polling to keep UI in sync
  useEffect(() => {
    refreshAll(true);
    fetchGifts()

    const interval = setInterval(() => {
      refreshAll(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);


  // Start a session
  const startSession = async (tableId: number) => {
    if (isStudying) {
      Alert.alert("Already studying", "You have an active session.");
      return;
    }

    setActionLoading(true);
    setIsStudying(true);

    setTables(prev =>
      prev.map(t => 
        t.table_id === tableId ? { ...t, occupied: true } : t
        )
    );

    try {
      const data = await api.startSession(userId, tableId)
      setSessionId(data.session_id);
      await refreshAll();
    } catch (err: any) {
      showError(err.message || "Failed to start session");
      setIsStudying(false);
      await fetchTables();
    } finally {
      setActionLoading(false);
    }
  };

  // End a session
  const endSession = async () => {
    if (!sessionId) return;

    setActionLoading(true);
    // Optimistic UI
    setIsStudying(false);

    try {
      await api.endSession(sessionId);
      await refreshAll();
    } catch (err: any) {
      showError(err.message);
      setIsStudying(true);
      await fetchTables();
    } finally {
      setActionLoading(false);
    }
  };

  const sendGift = async() => {
    console.log("Sending gift request");
    if (!giftUserId || !giftType) {
      Alert.alert("Missing info", "Please enter recipient and gift type.");
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

      await fetchGifts();
      await refreshUserSession();

      Alert.alert("Gift sent!", `You sent a ${giftType}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchGifts = async () => {
    try {
      const data = await api.getReceivedGifts(userId);
      setGifts(data);
    } catch (err: any) {
      showError("Failed to fetch gifts");
    }
  };

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
      <Text style={styles.coins}>🪙 {coins} coins</Text>

      <View style={styles.userSwitch}>
        <TouchableOpacity onPress={() => setUserId(1)}>
          <Text style={userId === 1 ? styles.activeUser : styles.user}>
            User 1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setUserId(2)}>
          <Text style={userId === 2 ? styles.activeUser : styles.user}>
            User 2
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {tables.map((table) => (
          <TouchableOpacity
            key={table.table_id}
            disabled={table.occupied || isStudying || actionLoading}
            onPress={() => startSession(table.table_id)}
          >
            <View
              style={[
                styles.table,
                table.occupied ? styles.occupied : styles.free,
              ]}
            >
              <Text style={styles.tableText}>{table.table_id}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {isStudying && (
        <TouchableOpacity 
        style={styles.endButton} 
        onPress={endSession}
        disabled={actionLoading}
        >
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
          <Text style={styles.giftTitle}>Received gifts</Text>

          {!Array.isArray(gifts) || gifts.length === 0 ? (
            <Text style={styles.empty}>No gifts yet</Text>
          ) : (
            gifts
            .slice()
            .reverse()
            .map((g, i) => (
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
    marginBottom: 20,
    textAlign: "center",
  },

  userSwitch: {
  flexDirection: "row",
  justifyContent: "center",
  gap: 20,
  marginBottom: 10,
  },
  user: {
    fontSize: 16,
    color: "#6b7280",
  },
  activeUser: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563eb",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  table: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  free: {
    backgroundColor: "#d1fae5",
  },
  occupied: {
    backgroundColor: "#fee2e2",
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

  coins: {
  fontSize: 16,
  textAlign: "center",
  marginBottom: 12,
  color: "#374151",
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
