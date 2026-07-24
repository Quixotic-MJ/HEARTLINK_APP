
import re

file_path = "app/(home)/(tabs)/wrap-up.tsx"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Replace Title
content = re.sub(
    r"<Text className=\"text-\[22px\] font-medium text-slate-900 dark:text-white tracking-tight\">\s*Weekly wrap-up\s*</Text>\s*<Text className=\"text-\[13px\] text-slate-400 mt-0\.5\">.*?</Text>",
    "<Text className=\"text-[22px] font-medium text-slate-900 dark:text-white tracking-tight\">\n            7-Day Wrap-up\n          </Text>\n          <Text className=\"text-[13px] text-slate-400 mt-0.5\">{dateRangeStr}</Text>",
    content
)

# Replace Export
content = re.sub(
    r"</View>\s*{/\* Export \*/}",
    "</View>\n\n        {wrapUpData?.activity_log && (\n          <ActivityLogAccordion activityLog={wrapUpData.activity_log} />\n        )}\n\n        {/* Export */}",
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

