import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { GwitchTheme } from "@renderer/theme/theme";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

function imageMime(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME[ext];
}

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
  image: {
    display: "block",
    maxWidth: "100%",
    padding: "0.5em",
    boxSizing: "border-box",
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
  const mime = path ? imageMime(path) : undefined;
  const [fetched, setFetched] = useState<{
    hash: string;
    path: string;
    content: string | null;
  } | null>(null);

  useEffect(() => {
    if (!hash || !path) return;
    const fetch = mime
      ? gwitch.getFileContentBase64(hash, path)
      : gwitch.getFileContent(hash, path);
    fetch
      .then((text) => setFetched({ hash, path, content: text }))
      .catch(() => setFetched({ hash, path, content: null }));
  }, [hash, path, mime]);

  const isCurrent = fetched !== null && fetched.hash === hash && fetched.path === path;
  const loading = !!(hash && path) && !isCurrent;
  const content = isCurrent ? fetched!.content : null;
  const isBinary = !mime && content !== null && content.includes("\x00");

  return (
    <div className={classes.container}>
      {!path ? (
        <div className={classes.placeholder}>Select a file to view its contents.</div>
      ) : loading ? (
        <div className={classes.placeholder}>Loading…</div>
      ) : content === null ? (
        <div className={classes.placeholder}>Unable to load file.</div>
      ) : mime ? (
        <img className={classes.image} src={`data:${mime};base64,${content}`} />
      ) : isBinary ? (
        <div className={classes.placeholder}>Binary file.</div>
      ) : (
        <pre className={classes.content}>{content}</pre>
      )}
    </div>
  );
}
