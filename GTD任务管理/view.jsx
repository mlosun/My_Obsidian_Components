function App() {
  const { getData, saveData } = useDataStorage();
  const app = useObsidianApp();
  const data = getData() || {};
  const settings = data.settings || {};
  
  // 状态管理
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(settings.defaultFilter || 'all');
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 在组件挂载时获取任务
  useEffect(() => {
    refreshTasks();
  }, []);
  const [sortOrder, setSortOrder] = useState(settings.sortBy || 'modified');
  
  // 获取所有任务
  useEffect(() => {
    const allTasks = Tasks.getTasks()
      .sort((a, b) => b.pos.start.offset - a.pos.start.offset)
      .slice(0, settings.taskLimit || 100);
    setTasks(allTasks);
  }, [settings.taskLimit]);

  // 刷新任务列表
  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    const allTasks = Tasks.getTasks();
    setTasks(allTasks);
    setIsRefreshing(false);
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    return {
      all: {
        label: '🗂️ 全部',
        count: tasks.length
      },
      inbox: {
        label: '📥 收集箱',
        count: tasks.filter(task => !task.text.includes('#') && task.status !== 'x').length
      },
      next: {
        label: '⏩ 下一步',
        count: tasks.filter(task => task.text.includes('#next')).length
      },
      waiting: {
        label: '⏳ 等待中',
        count: tasks.filter(task => task.text.includes('#waiting')).length
      },
      someday: {
        label: '📅 将来/也许',
        count: tasks.filter(task => task.text.includes('#someday')).length
      },
      completed: {
        label: '✓ 已完成',
        count: tasks.filter(task => task.status === 'x').length
      }
    };
  }, [tasks]);
  
  // 过滤和排序任务
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // 按状态过滤
    filtered = filtered.filter(task => {
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        if (!(
          task.text.toLowerCase().includes(searchLower) ||
          task.filePath.toLowerCase().includes(searchLower)
        )) {
          return false;
        }
      }

      switch(filter) {
        case 'inbox':
          return !task.text.includes('#project') && !task.text.includes('#context') && task.status !== 'x';
        case 'next':
          return task.text.includes('#next');
        case 'waiting':
          return task.text.includes('#waiting');
        case 'someday':
          return task.text.includes('#someday');
        case 'completed':
          return task.status === 'x';
        case 'all':
        default:
          return true;
      }
    });
    
    // 排序
    filtered.sort((a, b) => {
      switch(sortOrder) {
        case 'modified':
          return b.pos.start.offset - a.pos.start.offset;
        case 'created':
          return a.pos.start.offset - b.pos.start.offset;
        case 'alphabetical':
          return a.text.localeCompare(b.text);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [tasks, filter, searchText, sortOrder]);
  
  // 修改任务状态
  const updateTaskStatus = useCallback(async (task, newStatus) => {
    try {
      let updatedText = task.text;
      // 移除现有状态标签
      updatedText = updatedText.replace(/#(next|waiting|someday)\s*/g, '');
      // 添加新状态标签
      if (newStatus !== 'inbox' && newStatus !== 'completed') {
        updatedText += ` #${newStatus}`;
      }
      await Tasks.modifyTask(app, task.filePath, task.pos, updatedText);
      if (newStatus === 'completed') {
        await Tasks.setTaskStatus(app, task.filePath, task.pos, 'x');
      }
      const updatedTasks = Tasks.getTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [app]);
  
  // 取消完成状态
  const uncompleteTask = useCallback(async (task) => {
    try {
      await Tasks.setTaskStatus(app, task.filePath, task.pos, ' ');
      const updatedTasks = Tasks.getTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to uncomplete task:', error);
    }
  }, [app]);
  
  // 跳转到任务
  const navigateToTask = useCallback((task) => {
    Tasks.revealTaskInFile(app, task.filePath, task.pos);
  }, [app]);
  
  return (
    <div className="gtd-task-manager">
      {/* 统计信息和筛选器 */}
      <div className="gtd-stats">
        {Object.entries(stats).map(([key, { label, count }]) => (
          <button
            key={key}
            className={`gtd-stat-item ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            <span className="gtd-stat-label">{label}</span>
            <span className="gtd-stat-value">{count}</span>
          </button>
        ))}
      </div>
      
      {/* 搜索和排序控制 */}
      <div className="gtd-controls">
        <div className="gtd-control-row">
          <input
            type="text"
            placeholder="搜索任务或路径..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="gtd-search"
          />
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="gtd-select"
          >
            <option value="modified">最后修改</option>
            <option value="created">创建时间</option>
            <option value="alphabetical">字母顺序</option>
          </select>

          <button
            className={`gtd-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={refreshTasks}
            title="刷新任务列表"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* 任务列表 */}
      <div className="gtd-task-list">
        {filteredTasks.map((task) => {
          const taskElement = document.createElement('div');
          Obsidian.MarkdownRenderer.renderMarkdown(task.text, taskElement, task.filePath, app);
          
          return (
            <div key={`${task.filePath}-${task.pos.start.line}`} className="gtd-task-item">
              <div className="gtd-task-content" onClick={() => navigateToTask(task)}>
                {settings.showFilePath && (
                  <div className="gtd-task-filepath">{task.filePath}</div>
                )}
                <div dangerouslySetInnerHTML={{ __html: taskElement.innerHTML }} />
              </div>
              <div className="gtd-task-actions">
                {task.status !== 'x' ? (
                  <>
                    <button
                      className="gtd-action-btn status-btn inbox"
                      onClick={() => updateTaskStatus(task, 'inbox')}
                      title="移至收集箱"
                    >
                      📥
                    </button>
                    <button
                      className="gtd-action-btn status-btn next"
                      onClick={() => updateTaskStatus(task, 'next')}
                      title="移至下一步"
                    >
                      ⏩
                    </button>
                    <button
                      className="gtd-action-btn status-btn waiting"
                      onClick={() => updateTaskStatus(task, 'waiting')}
                      title="移至等待中"
                    >
                      ⏳
                    </button>
                    <button
                      className="gtd-action-btn status-btn someday"
                      onClick={() => updateTaskStatus(task, 'someday')}
                      title="移至将来/也许"
                    >
                      📅
                    </button>
                    <button 
                      className="gtd-action-btn complete"
                      onClick={() => updateTaskStatus(task, 'completed')}
                      title="标记为完成"
                    >
                      ✓
                    </button>
                  </>
                ) : (
                  <button 
                    className="gtd-action-btn uncomplete"
                    onClick={() => uncompleteTask(task)}
                    title="取消完成"
                  >
                    ↩
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="gtd-empty-state">
            没有找到任务
          </div>
        )}
      </div>
    </div>
  );
}