import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// A top-level error boundary. In a release build a JS exception during
// render normally results in a silent crash with no UI. This boundary
// catches the error, displays the stack on-screen, and offers a retry.
//
// Keep this component free of any third-party imports so it can't itself
// crash.

interface State {
  error: Error | null;
  info: string | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ error, info: info.componentStack });
    if (typeof console !== "undefined" && console.error) {
      console.error("App crashed:", error, info?.componentStack);
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Something broke.</Text>
          <Text style={styles.subtitle}>
            The app caught a crash before it could load. Take a screenshot
            of the message below and share it with the developer.
          </Text>
          <Text style={styles.error}>{String(this.state.error?.message ?? this.state.error)}</Text>
          {this.state.error?.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
          {this.state.info ? (
            <Text style={styles.stack}>{this.state.info}</Text>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { padding: 24, paddingTop: 64 },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  error: {
    color: "#FCA5A5",
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 14,
  },
  stack: {
    color: "#71717A",
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 16,
    marginBottom: 14,
  },
  btn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  btnText: { color: "#0A0A0A", fontWeight: "800" },
});
