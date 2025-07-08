import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, Edit2, Trash2, Filter, Moon, Sun, TrendingUp, Bot, Quote, Eye, EyeOff, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, startOfWeek, addDays, isToday, formatISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, endOfDay, addWeeks, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AgendaItem {
  id: string
  title: string
  description: string
  date: string
  time: string
  category: string
  priority: 'low' | 'medium' | 'high'
  color: string
  completed?: boolean
  user_id: string
}

interface WeeklyAnalysis {
  totalTasks: number
  completedTasks: number
  timeByCategory: { [key: string]: number }
  productivityScore: number
  workLifeBalance: number
}

const categories = [
  { value: 'work', label: 'Travail', color: 'bg-blue-500' },
  { value: 'personal', label: 'Personnel', color: 'bg-green-500' },
  { value: 'health', label: 'Santé', color: 'bg-red-500' },
  { value: 'social', label: 'Social', color: 'bg-purple-500' },
  { value: 'education', label: 'Éducation', color: 'bg-yellow-500' },
  { value: 'other', label: 'Autre', color: 'bg-gray-500' }
]

const priorityColors = {
  low: 'border-l-gray-300',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500'
}

const dailyQuotes = [
  "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.",
  "Chaque jour est une nouvelle opportunité de devenir meilleur.",
  "L'organisation est la clé de la productivité.",
  "Planifier, c'est déjà réussir à moitié.",
  "La persévérance est la clé de tous les triomphes.",
  "Aujourd'hui est le premier jour du reste de votre vie.",
  "L'excellence est un art que l'on n'atteint que par l'exercice constant."
]

function App() {
  const [user] = useState<{ id: string; displayName?: string; email: string }>({ 
    id: 'demo-user', 
    displayName: 'Utilisateur Demo', 
    email: 'demo@example.com' 
  })
  const [loading] = useState(false)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showQuote, setShowQuote] = useState(true)
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  })

  const todayQuote = dailyQuotes[new Date().getDay()]

  // Load from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('agenda-items')
    if (savedItems) {
      setAgendaItems(JSON.parse(savedItems))
    }
    const savedDarkMode = localStorage.getItem('dark-mode')
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode))
    }
  }, [])

  // Save to localStorage when items change
  useEffect(() => {
    localStorage.setItem('agenda-items', JSON.stringify(agendaItems))
  }, [agendaItems])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('dark-mode', JSON.stringify(darkMode))
  }, [darkMode])

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleAddItem = () => {
    if (!formData.title || !formData.date || !formData.category) return

    const newItem: AgendaItem = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      priority: formData.priority,
      color: categories.find(c => c.value === formData.category)?.color || 'bg-gray-500',
      completed: false,
      user_id: user.id
    }

    setAgendaItems([...agendaItems, newItem])
    resetForm()
    generateAISuggestions()
  }

  const handleEditItem = () => {
    if (!editingItem || !formData.title || !formData.date || !formData.category) return

    setAgendaItems(agendaItems.map(item => 
      item.id === editingItem.id 
        ? {
            ...item,
            title: formData.title,
            description: formData.description,
            date: formData.date,
            time: formData.time,
            category: formData.category,
            priority: formData.priority,
            color: categories.find(c => c.value === formData.category)?.color || 'bg-gray-500'
          }
        : item
    ))
    resetForm()
  }

  const handleDeleteItem = (id: string) => {
    setAgendaItems(agendaItems.filter(item => item.id !== id))
  }

  const toggleItemCompletion = (id: string) => {
    setAgendaItems(agendaItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const generateWeeklyAnalysis = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfDay(addDays(weekStart, 6))
    
    const weekItems = agendaItems.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= weekStart && itemDate <= weekEnd
    })

    const completedItems = weekItems.filter(item => item.completed)
    const timeByCategory = categories.reduce((acc, cat) => {
      acc[cat.value] = weekItems.filter(item => item.category === cat.value).length
      return acc
    }, {} as { [key: string]: number })

    const workTasks = timeByCategory.work || 0
    const personalTasks = timeByCategory.personal + timeByCategory.health + timeByCategory.social || 0
    const workLifeBalance = workTasks > 0 ? (personalTasks / workTasks) * 100 : 100
    const productivityScore = weekItems.length > 0 ? (completedItems.length / weekItems.length) * 100 : 0

    setWeeklyAnalysis({
      totalTasks: weekItems.length,
      completedTasks: completedItems.length,
      timeByCategory,
      productivityScore: Math.round(productivityScore),
      workLifeBalance: Math.round(workLifeBalance)
    })
  }

  const generateAISuggestions = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfDay(addDays(weekStart, 6))
    
    const weekItems = agendaItems.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= weekStart && itemDate <= weekEnd
    })

    const suggestions = []
    
    // Find free time slots
    const busyDays = weekItems.map(item => item.date)
    const allDays = Array.from({ length: 7 }, (_, i) => formatISO(addDays(weekStart, i), { representation: 'date' }))
    const freeDays = allDays.filter(day => !busyDays.includes(day))
    
    if (freeDays.length > 0) {
      suggestions.push(`Vous avez ${freeDays.length} jour(s) libre(s) cette semaine. Pourquoi ne pas planifier du temps pour vous ?`)
    }

    // Priority suggestions
    const highPriorityItems = weekItems.filter(item => item.priority === 'high' && !item.completed)
    if (highPriorityItems.length > 0) {
      suggestions.push(`Vous avez ${highPriorityItems.length} tâche(s) prioritaire(s) à terminer.`)
    }

    // Balance suggestions
    const workItems = weekItems.filter(item => item.category === 'work')
    const personalItems = weekItems.filter(item => ['personal', 'health', 'social'].includes(item.category))
    
    if (workItems.length > personalItems.length * 2) {
      suggestions.push("Pensez à équilibrer votre semaine avec plus d'activités personnelles.")
    }

    setAiSuggestions(suggestions)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      category: '',
      priority: 'medium'
    })
    setEditingItem(null)
    setIsDialogOpen(false)
  }

  const openEditDialog = (item: AgendaItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description,
      date: item.date,
      time: item.time,
      category: item.category,
      priority: item.priority
    })
    setIsDialogOpen(true)
  }

  const getItemsForDate = (date: Date) => {
    const dateStr = formatISO(date, { representation: 'date' })
    return agendaItems.filter(item => {
      const matchesDate = item.date === dateStr
      const matchesFilter = selectedFilter === 'all' || item.category === selectedFilter
      return matchesDate && matchesFilter
    }).sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time)
      }
      return 0
    })
  }

  const renderDayView = () => {
    const dayItems = getItemsForDate(currentDate)
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold">
            {format(currentDate, 'EEEE dd MMMM yyyy', { locale: fr })}
          </h2>
          {isToday(currentDate) && (
            <Badge variant="default" className="mt-2">Aujourd'hui</Badge>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Événements du jour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun événement aujourd'hui</p>
            ) : (
              dayItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-l-4 ${priorityColors[item.priority]} bg-card shadow-sm hover:shadow-md transition-shadow ${
                    item.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <h4 className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                          {item.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemCompletion(item.id)}
                          className="h-6 w-6 p-0"
                        >
                          {item.completed ? '✓' : '○'}
                        </Button>
                      </div>
                      {item.time && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <Clock className="h-4 w-4" />
                          {item.time}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {categories.find(c => c.value === item.category)?.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">
            Semaine du {format(weekStart, 'dd MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayItems = getItemsForDate(day)
            const isCurrentDay = isToday(day)

            return (
              <Card key={index} className={`min-h-[300px] ${isCurrentDay ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    <div className="flex items-center gap-2">
                      {format(day, 'EEE', { locale: fr })}
                      <Badge variant={isCurrentDay ? "default" : "outline"}>
                        {format(day, 'dd')}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Aucun élément</p>
                  ) : (
                    dayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border-l-4 ${priorityColors[item.priority]} bg-card shadow-sm hover:shadow-md transition-shadow ${
                          item.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${item.color}`} />
                              <h4 className={`font-medium text-sm ${item.completed ? 'line-through' : ''}`}>
                                {item.title}
                              </h4>
                            </div>
                            {item.time && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                <Clock className="h-3 w-3" />
                                {item.time}
                              </div>
                            )}
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <Badge variant="outline" className="mt-2 text-xs">
                              {categories.find(c => c.value === item.category)?.label}
                            </Badge>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleItemCompletion(item.id)}
                              className="h-6 w-6 p-0"
                            >
                              {item.completed ? '✓' : '○'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-sm">
              {day}
            </div>
          ))}
          
          {monthDays.map((day, index) => {
            const dayItems = getItemsForDate(day)
            const isCurrentDay = isToday(day)
            const isCurrentMonth = isSameMonth(day, currentDate)

            return (
              <Card 
                key={index} 
                className={`min-h-[100px] cursor-pointer transition-all ${
                  isCurrentDay ? 'ring-2 ring-blue-500' : ''
                } ${
                  !isCurrentMonth ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  setCurrentDate(day)
                  setViewMode('day')
                }}
              >
                <CardContent className="p-2">
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`text-xs p-1 rounded ${item.color} text-white truncate ${
                          item.completed ? 'opacity-60' : ''
                        }`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayItems.length - 3} autres
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, direction === 'next' ? 1 : -1))
    } else {
      setCurrentDate(addMonths(currentDate, direction === 'next' ? 1 : -1))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Chargement de votre agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Agenda Professionnel
              </h1>
              <p className="text-muted-foreground">
                Bonjour {user.displayName || user.email}, organisez votre temps avec intelligence
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Daily Quote */}
          {showQuote && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Quote className="h-5 w-5 text-blue-500" />
                    <p className="text-sm italic text-muted-foreground">
                      "{todayQuote}"
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuote(false)}
                    className="h-6 w-6 p-0"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium">Suggestions intelligentes</h3>
                </div>
                <div className="space-y-1">
                  {aiSuggestions.map((suggestion, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {suggestion}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Controls */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week' | 'month')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="day">Jour</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
                <TabsTrigger value="month">Mois</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigateDate('prev')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="font-medium"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateDate('next')}
                className="flex items-center gap-2"
              >
                Suivant
                <Calendar className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  generateWeeklyAnalysis()
                  generateAISuggestions()
                  setShowAnalysis(true)
                }}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analyser
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Modifier l\'élément' : 'Ajouter un nouvel élément'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Titre *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Titre de l'événement"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Description optionnelle"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="time">Heure</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Catégorie *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priorité</Label>
                      <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({...formData, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Faible</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Élevée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingItem ? handleEditItem : handleAddItem}
                        className="flex-1"
                      >
                        {editingItem ? 'Modifier' : 'Ajouter'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Weekly Analysis Dialog */}
        <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analyse de la semaine
              </DialogTitle>
            </DialogHeader>
            {weeklyAnalysis && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {weeklyAnalysis.totalTasks}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tâches planifiées
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {weeklyAnalysis.completedTasks}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tâches terminées
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Score de productivité</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${weeklyAnalysis.productivityScore}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {weeklyAnalysis.productivityScore}% de vos tâches terminées
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Équilibre vie pro/perso</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(weeklyAnalysis.workLifeBalance, 100)}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {weeklyAnalysis.workLifeBalance}% d'équilibre
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Répartition par catégorie</h4>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <div key={cat.value} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                          <span className="text-sm">{cat.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {weeklyAnalysis.timeByCategory[cat.value] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <div className="mb-8">
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Légende des catégories</h3>
              {!showQuote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuote(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Afficher la citation
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {categories.map((category) => (
                <div key={category.value} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <span className="text-sm">{category.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App