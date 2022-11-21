import React from "react";
import { Allotment } from "allotment";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { setStageSplit } from "../../store/layout/actions";
import { Patch } from "../Patch";
import { Status } from "../Status";
import deepEqual from "deep-equal";

export function Stage() {
  const dispatch = useDispatch();
  const split = useSelector((state: RootState) => state.layout.stageSplit);

  return (
    <Allotment
      vertical={true}
      defaultSizes={split}
      onChange={(newSplit) => {
        if (!deepEqual(newSplit, split))
          dispatch(setStageSplit(newSplit));
      }}
    >
      <Allotment.Pane>
        <Patch />
      </Allotment.Pane>
      <Allotment.Pane>
        <Status />
      </Allotment.Pane>
    </Allotment>
  );
}
