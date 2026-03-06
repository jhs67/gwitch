import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { GwitchTheme } from "@renderer/theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  container: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
  },
  placeholder: {
    color: theme.colors.secondary,
    padding: "1em",
  },
  content: {
    margin: 0,
    padding: "0.5em",
    fontFamily: theme.typography.monospaceFace,
    whiteSpace: "pre",
    color: theme.colors.primary,
  },
}));

export function FileContent({
  hash,
  path,
}: {
  hash: string | undefined;
  path: string | undefined;
}) {
  const classes = useStyles();
  const [fetched, setFetched] = useState<{
    hash: string;
    path: string;
    content: string | null;
  } | null>(null);

  useEffect(() => {
    if (!hash || !path) return;
    gwitch
      .getFileContent(hash, path)
      .then((text) => setFetched({ hash, path, content: text }))
      .catch(() => setFetched({ hash, path, content: null }));
  }, [hash, path]);

  const isCurrent = fetched?.hash === hash && fetched?.path === path;
  const loading = !!(hash && path) && !isCurrent;
  const content = isCurrent ? fetched!.content : null;
  const isBinary = content !== null && content.includes("\x00");

  return (
    <div className={classes.container}>
      {!path ? (
        <div className={classes.placeholder}>Select a file to view its contents.</div>
      ) : loading ? (
        <div className={classes.placeholder}>Loading…</div>
      ) : content === null ? (
        <div className={classes.placeholder}>Unable to load file.</div>
      ) : isBinary ? (
        <div className={classes.placeholder}>Binary file.</div>
      ) : (
        <pre className={classes.content}>{content}</pre>
      )}
    </div>
  );
}
