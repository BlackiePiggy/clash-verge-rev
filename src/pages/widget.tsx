import { RadioButtonChecked, RadioButtonUnchecked } from "@mui/icons-material";
import {
  Box,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useLockFn } from "ahooks";
import dayjs from "dayjs";
import { useMemo } from "react";
import { closeAllConnections } from "tauri-plugin-mihomo-api";

import { useCurrentProxy } from "@/hooks/use-current-proxy";
import { useProfiles } from "@/hooks/use-profiles";
import { useSystemProxyState } from "@/hooks/use-system-proxy-state";
import { useTrafficData } from "@/hooks/use-traffic-data";
import { useVerge } from "@/hooks/use-verge";
import { useAppData } from "@/providers/app-data-context";
import { patchClashMode } from "@/services/cmds";
import parseTraffic from "@/utils/parse-traffic";

const MODES = ["rule", "global", "direct"] as const;
type Mode = (typeof MODES)[number];

const parseExpireStatus = (expire?: number) => {
  if (!expire || expire <= 0) return "未知";
  return dayjs.unix(expire).isBefore(dayjs()) ? "已过期" : "有效";
};

const WidgetPage = () => {
  const { currentProxy } = useCurrentProxy();
  const { response } = useTrafficData();
  const { actualState, toggleSystemProxy } = useSystemProxyState();
  const { current } = useProfiles();
  const { clashConfig, refreshClashConfig } = useAppData();
  const { verge } = useVerge();

  const mode = (clashConfig?.mode?.toLowerCase() as Mode | undefined) ?? "rule";

  const usedTraffic = useMemo(() => {
    if (!current?.extra) return "-";
    const used = current.extra.upload + current.extra.download;
    return `${parseTraffic(used).join(" ")} / ${parseTraffic(current.extra.total).join(" ")}`;
  }, [current]);

  const onChangeMode = useLockFn(async (nextMode: Mode) => {
    if (nextMode === mode) return;
    if (verge?.auto_close_connection) {
      await closeAllConnections();
    }
    await patchClashMode(nextMode);
    await refreshClashConfig();
  });

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography fontWeight={700}>系统代理</Typography>
          <Switch
            checked={actualState}
            onChange={(_, checked) => void toggleSystemProxy(checked)}
          />
        </Stack>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            当前节点
          </Typography>
          <Typography fontWeight={600}>
            {currentProxy?.name || "未连接"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            当前网速：↑ {parseTraffic(response.data?.up || 0).join(" ")}/s · ↓{" "}
            {parseTraffic(response.data?.down || 0).join(" ")}/s
          </Typography>
        </Box>

        <Divider />

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block" }}
          >
            代理模式
          </Typography>
          <RadioGroup
            value={mode}
            onChange={(e) => void onChangeMode(e.target.value as Mode)}
          >
            {MODES.map((item) => (
              <FormControlLabel
                key={item}
                value={item}
                control={
                  <Radio
                    icon={<RadioButtonUnchecked fontSize="small" />}
                    checkedIcon={<RadioButtonChecked fontSize="small" />}
                    size="small"
                  />
                }
                label={item.toUpperCase()}
              />
            ))}
          </RadioGroup>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            流量统计
          </Typography>
          <Typography variant="body2">
            上传速度：{parseTraffic(response.data?.up || 0).join(" ")}/s
          </Typography>
          <Typography variant="body2">
            下载速度：{parseTraffic(response.data?.down || 0).join(" ")}/s
          </Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            当前订阅
          </Typography>
          <Typography variant="body2">名称：{current?.name || "-"}</Typography>
          <Typography variant="body2">已使用量：{usedTraffic}</Typography>
          <Typography variant="body2">
            状态：{parseExpireStatus(current?.extra?.expire)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default WidgetPage;
