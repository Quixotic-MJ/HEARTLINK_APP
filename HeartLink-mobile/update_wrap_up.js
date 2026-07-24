const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'app', '(home)', '(tabs)', 'wrap-up.tsx');

let content = fs.readFileSync(p, 'utf8');

const target1 = `  const [cssScore, setCssScore] = useState<number>(0);
  const [dynamicInsight, setDynamicInsight] = useState<{ title: string; text: string } | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setIsLoading(true);
    
    try {
      const response = await fetch(\`\${base_url}/api/dashboard/me\`, {
        headers: {
          "Authorization": \`Bearer \${userId}\`
        }
      });
      if (response.ok) {
        const dash = await response.json();
        if (dash.css_score !== undefined) {
          setCssScore(dash.css_score);
        }
        if (dash.insight) {
          setDynamicInsight({
            title: dash.insight.title || "Weekly Insight",
            text: dash.insight.body || dash.insight.text,
          });
        }
      }
    } catch (error) {
      console.error("Wrap-up fetch error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Determine positive/negative week based on fetched CSS score
  const isPositive = cssScore >= 60 || cssScore === 0; // fallback to positive if 0
  const d = { ...(isPositive ? POSITIVE_DATA : NEGATIVE_DATA) };

  // Override with dynamic API insight if available
  if (dynamicInsight) {
    d.bannerTitle = dynamicInsight.title;
    d.bannerText = dynamicInsight.text;
  }

  // Use the fetched score in the display if available, else fallback
  const displayCss = cssScore > 0 ? cssScore : d.css;`;

const replacement1 = `  const [cssScore, setCssScore] = useState<number>(0);
  const [dynamicInsight, setDynamicInsight] = useState<{ title: string; text: string } | null>(null);
  const [wrapUpData, setWrapUpData] = useState<any>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setIsLoading(true);
    
    try {
      const response = await fetch(\`\${base_url}/api/dashboard/me/wrap-up\`, {
        headers: {
          "Authorization": \`Bearer \${userId}\`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWrapUpData(data);
        if (data.css !== undefined) {
          setCssScore(data.css);
        }
        if (data.bannerTitle) {
          setDynamicInsight({
            title: data.bannerTitle,
            text: data.bannerText,
          });
        }
      } else {
        // Fallback to basic dashboard if new endpoint is missing
        const fallbackRes = await fetch(\`\${base_url}/api/dashboard/me\`, {
           headers: { "Authorization": \`Bearer \${userId}\` }
        });
        if (fallbackRes.ok) {
          const dash = await fallbackRes.json();
          setCssScore(dash.css_score || 0);
        }
      }
    } catch (error) {
      console.error("Wrap-up fetch error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Determine positive/negative week based on fetched CSS score
  const isPositive = wrapUpData ? wrapUpData.isPositive : (cssScore >= 60 || cssScore === 0);
  const d = wrapUpData ? { ...wrapUpData } : { ...(isPositive ? POSITIVE_DATA : NEGATIVE_DATA) };

  // Override with dynamic API insight if available
  if (dynamicInsight) {
    d.bannerTitle = dynamicInsight.title;
    d.bannerText = dynamicInsight.text;
  }

  // Use the fetched score in the display if available, else fallback
  const displayCss = cssScore > 0 ? cssScore : d.css;

  // Date range logic
  const todayDate = new Date();
  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(todayDate.getDate() - 7);
  const dateRangeStr = \`\${sevenDaysAgoDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - \${todayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}\`;`;

const target2 = `          <Text className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">
            Weekly wrap-up
          </Text>`;
          
const replacement2 = `          <Text className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">
            7-Day Wrap-up
          </Text>`;
          
content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

// Replace the date substring (it might have an en-dash or strange char)
content = content.replace(/May 28 .*? June 3/, "{dateRangeStr}");

const target3 = `        </View>

        {/* Export */}`;
const replacement3 = `        </View>

        {wrapUpData?.activity_log && (
          <ActivityLogAccordion activityLog={wrapUpData.activity_log} />
        )}

        {/* Export */}`;
content = content.replace(target3, replacement3);

fs.writeFileSync(p, content, 'utf8');
