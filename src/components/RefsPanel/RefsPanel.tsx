import React, { useState } from "react";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  refsPanel: {
    flex: "0 0 auto",
    padding: "5px",
    maxWidth: "20vw",
    minWidth: "15rem",
    backgroundColor: "#eef1f1",
    borderRight: "1px solid #d5d5d5",
  },
});

export function RefsPanel() {
  return <div>RefsPanel</div>;
}
