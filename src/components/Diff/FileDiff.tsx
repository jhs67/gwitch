    borderColor: theme.colors.softBorder,
        fill: theme.colors.primary,
      backgroundColor: theme.colors.frame,

      "& .hunktop": {
        display: "flex",
        alignItems: "center",
      },

      "& .hunklabel": {
        flex: 1,
      },
      borderColor: theme.colors.softBorder,
      backgroundColor: theme.colors.frame,
      backgroundColor: theme.colors.diff.new.background,
      color: theme.colors.diff.new.primary,
      backgroundColor: theme.colors.diff.old.background,
      color: theme.colors.diff.old.primary,
      backgroundColor: theme.colors.diff.selected.background,
      color: theme.colors.lessprimary,
      color: theme.colors.link.primary,
      flex: "0",
        border: `1px solid ${theme.colors.diff.buttons.border}`,
        backgroundColor: theme.colors.diff.buttons.background,
        color: theme.colors.diff.buttons.primary,
          borderColor: theme.colors.diff.buttons.hover.border,
          color: theme.colors.diff.buttons.hover.primary,
    <div
      className={classes.patch}
      onMouseDown={clickLine && ((ev) => clickLine(ev.nativeEvent))}
    >
                      <div className="hunktop">
                        <div className="hunklabel">{h.header}</div>
                        {actions ? (
                          <div className="buttons">
                            {actions.map((a) => (
                              <div
                                key={a.label}
                                onClick={() =>
                                  a.act({ start: origin, end: origin + h.lines.length - 1 })
                                }
                              >
                                {a.label}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>