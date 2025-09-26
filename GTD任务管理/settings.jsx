function App() {
  const { getData, saveData } = useDataStorage();
  const data = getData() || {};
  const settings = data.settings || {};
  
  // 保存设置
  const updateSettings = (newSettings) => {
    saveData({
      ...data,
      settings: {
        ...settings,
        ...newSettings
      }
    });
  };
  
  return (
    <Settings>
      <SettingItem label="默认视图">
        <select
          value={settings.defaultFilter || 'all'}
          onChange={(e) => updateSettings({ defaultFilter: e.target.value })}
          className="gtd-select"
        >
          <option value="all">全部</option>
          <option value="inbox">收集箱</option>
          <option value="next">下一步</option>
          <option value="waiting">等待中</option>
          <option value="someday">将来/也许</option>
          <option value="completed">已完成</option>
        </select>
      </SettingItem>

      <SettingItem label="任务排序">
        <select
          value={settings.sortBy || 'modified'}
          onChange={(e) => updateSettings({ sortBy: e.target.value })}
          className="gtd-select"
        >
          <option value="modified">最后修改时间</option>
          <option value="created">创建时间</option>
          <option value="alphabetical">字母顺序</option>
        </select>
      </SettingItem>

      <SettingItem label="显示任务路径">
        <div className="gtd-setting-row">
          <SettingInput
            type="checkbox"
            checked={settings.showFilePath || false}
            onChange={(e) => updateSettings({ showFilePath: e.target.checked })}
          />
        </div>
      </SettingItem>

      <SettingTitle>📖 GTD 工作流说明</SettingTitle>
      <SettingDescription>
        1. 收集箱：捕获所有新任务和想法<br />
        2. 下一步：已明确的下一步行动<br />
        3. 等待中：需要等待他人的任务<br />
        4. 将来/也许：未来可能执行的任务<br />
        5. 已完成：已完成的任务
      </SettingDescription>
      
      <SettingTitle>🏷️ 任务标签说明</SettingTitle>
      <SettingDescription>
        - #next：标记为下一步任务<br />
        - #waiting：标记为等待中任务<br />
        - #someday：标记为将来/也许任务<br />
        - #project：项目任务<br />
        - #context：上下文任务
      </SettingDescription>
    </Settings>
  );
}