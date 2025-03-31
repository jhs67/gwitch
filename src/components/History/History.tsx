import React from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { Log } from "../Log";
import { Commit } from "../Commit";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setHistorySplit } from "../../store/layout/actions";
import deepEqual from "deep-equal";

export function History() {
  const dispatch = useDispatch();
  const split = useSelector((state: RootState) => state.layout.historySplit);

  return (
    <Allotment
      vertical={true}
      defaultSizes={split}
      onChange={(newSplit) => {
        if (!deepEqual(newSplit, split)) dispatch(setHistorySplit(newSplit));
      }}
    >
      <Allotment.Pane>
        <Log />
      </Allotment.Pane>
      <Allotment.Pane>
        <Commit />
      </Allotment.Pane>
    </Allotment>
  );
}
