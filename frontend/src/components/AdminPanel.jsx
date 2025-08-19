import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { Plus, Trash2, Save, Eye } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const AdminPanel = ({ onClose }) => {
  const [newGame, setNewGame] = useState({
    level: 'easy',
    title: '',
    words: Array(16).fill(''),
    groups: [
      { category: '', words: ['', '', '', ''], difficulty: 1 },
      { category: '', words: ['', '', '', ''], difficulty: 2 },
      { category: '', words: ['', '', '', ''], difficulty: 3 },
      { category: '', words: ['', '', '', ''], difficulty: 4 }
    ]
  });
  
  const { toast } = useToast();

  const handleWordChange = (index, value) => {
    const newWords = [...newGame.words];
    newWords[index] = value.toUpperCase();
    setNewGame({ ...newGame, words: newWords });
  };

  const handleGroupChange = (groupIndex, field, value) => {
    const newGroups = [...newGame.groups];
    if (field === 'category') {
      newGroups[groupIndex].category = value;
    } else if (field.startsWith('word')) {
      const wordIndex = parseInt(field.split('_')[1]);
      newGroups[groupIndex].words[wordIndex] = value.toUpperCase();
    }
    setNewGame({ ...newGame, groups: newGroups });
  };

  const autoFillWords = () => {
    const allGroupWords = newGame.groups.flatMap(group => group.words).filter(word => word.trim());
    if (allGroupWords.length === 16) {
      // Shuffle the words
      const shuffledWords = [...allGroupWords].sort(() => Math.random() - 0.5);
      setNewGame({ ...newGame, words: shuffledWords });
      toast({
        title: "Words Auto-Filled! 🎯",
        description: "Words from groups have been shuffled into the main word grid.",
        className: "bg-cyan-900 border-brand-cyan text-brand-cyan-bright"
      });
    } else {
      toast({
        title: "Fill All Group Words First",
        description: `You need exactly 16 words in your groups (currently have ${allGroupWords.length}).`,
        variant: "destructive"
      });
    }
  };

  const validateGame = () => {
    const errors = [];
    
    if (!newGame.title.trim()) errors.push('Game title is required');
    if (newGame.words.some(word => !word.trim())) errors.push('All 16 words must be filled');
    if (newGame.groups.some(group => !group.category.trim())) errors.push('All group categories must be named');
    if (newGame.groups.some(group => group.words.some(word => !word.trim()))) errors.push('All group words must be filled');
    
    // Check if all group words appear in main words array
    const groupWords = newGame.groups.flatMap(group => group.words);
    const mainWords = newGame.words;
    const missingWords = groupWords.filter(word => !mainWords.includes(word));
    if (missingWords.length > 0) errors.push(`These group words are missing from main words: ${missingWords.join(', ')}`);
    
    return errors;
  };

  const saveGame = async () => {
    const errors = validateGame();
    if (errors.length > 0) {
      toast({
        title: "Validation Errors",
        description: errors[0],
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you'd send this to your backend API
      console.log('New game to save:', newGame);
      
      toast({
        title: "Game Saved! 🎉",
        description: `"${newGame.title}" has been added to ${newGame.level} level.`,
        className: "bg-cyan-900 border-brand-cyan text-brand-cyan-bright"
      });
      
      // Reset form
      setNewGame({
        level: 'easy',
        title: '',
        words: Array(16).fill(''),
        groups: [
          { category: '', words: ['', '', '', ''], difficulty: 1 },
          { category: '', words: ['', '', '', ''], difficulty: 2 },
          { category: '', words: ['', '', '', ''], difficulty: 3 },
          { category: '', words: ['', '', '', ''], difficulty: 4 }
        ]
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save the game. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadTemplate = (level) => {
    const templates = {
      easy: {
        title: 'My Neighborhood',
        words: ['HOUSE', 'STORE', 'PARK', 'SCHOOL', 'DOG', 'CAT', 'BIRD', 'FISH', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'HAPPY', 'SAD', 'TALL', 'SHORT'],
        groups: [
          { category: 'Places', words: ['HOUSE', 'STORE', 'PARK', 'SCHOOL'], difficulty: 1 },
          { category: 'Pets', words: ['DOG', 'CAT', 'BIRD', 'FISH'], difficulty: 2 },
          { category: 'Colors', words: ['RED', 'BLUE', 'GREEN', 'YELLOW'], difficulty: 3 },
          { category: 'Feelings', words: ['HAPPY', 'SAD', 'TALL', 'SHORT'], difficulty: 4 }
        ]
      },
      medium: {
        title: 'Space Exploration',
        words: ['ROCKET', 'PLANET', 'STAR', 'MOON', 'ORBIT', 'GRAVITY', 'VACUUM', 'RADIATION', 'MARS', 'VENUS', 'JUPITER', 'SATURN', 'ASTRONAUT', 'MISSION', 'LAUNCH', 'LANDING'],
        groups: [
          { category: 'Space Objects', words: ['ROCKET', 'PLANET', 'STAR', 'MOON'], difficulty: 1 },
          { category: 'Space Physics', words: ['ORBIT', 'GRAVITY', 'VACUUM', 'RADIATION'], difficulty: 2 },
          { category: 'Planets', words: ['MARS', 'VENUS', 'JUPITER', 'SATURN'], difficulty: 3 },
          { category: 'Space Mission', words: ['ASTRONAUT', 'MISSION', 'LAUNCH', 'LANDING'], difficulty: 4 }
        ]
      }
    };
    
    if (templates[level]) {
      setNewGame({ ...newGame, level, ...templates[level] });
      toast({
        title: "Template Loaded! 📋",
        description: `${level} level template has been loaded. Modify as needed.`,
        className: "bg-cyan-900 border-brand-cyan text-brand-cyan-bright"
      });
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-brand-cyan-bright">Game Admin Panel</h1>
          <Button onClick={onClose} variant="outline" className="border-brand-cyan text-brand-cyan">
            Close Admin
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Game Details */}
          <Card className="bg-brand-navy border-brand-cyan">
            <CardHeader>
              <CardTitle className="text-brand-cyan-bright">Game Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-brand-cyan">Level</Label>
                <select 
                  value={newGame.level}
                  onChange={(e) => setNewGame({ ...newGame, level: e.target.value })}
                  className="w-full p-2 bg-brand-dark border border-brand-cyan rounded text-brand-cyan-bright"
                >
                  <option value="easy">Easy (Grades 1-2)</option>
                  <option value="medium">Medium (Grades 3-4)</option>
                  <option value="hard">Hard (Grades 5-6)</option>
                  <option value="youth">Youth (Grade 6+)</option>
                </select>
              </div>
              
              <div>
                <Label className="text-brand-cyan">Game Title</Label>
                <Input
                  value={newGame.title}
                  onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                  placeholder="Enter game title..."
                  className="bg-brand-dark border-brand-cyan text-brand-cyan-bright"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => loadTemplate('easy')} size="sm" variant="outline" className="border-cyan-400 text-cyan-400">
                  Load Easy Template
                </Button>
                <Button onClick={() => loadTemplate('medium')} size="sm" variant="outline" className="border-cyan-400 text-cyan-400">
                  Load Medium Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Groups */}
          <Card className="bg-brand-navy border-brand-cyan">
            <CardHeader>
              <CardTitle className="text-brand-cyan-bright">Groups (4 words each)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {newGame.groups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-brand-cyan/30 p-3 rounded">
                  <Input
                    value={group.category}
                    onChange={(e) => handleGroupChange(groupIndex, 'category', e.target.value)}
                    placeholder={`Group ${groupIndex + 1} category...`}
                    className="mb-2 bg-brand-dark border-cyan-400 text-brand-cyan-bright"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {group.words.map((word, wordIndex) => (
                      <Input
                        key={wordIndex}
                        value={word}
                        onChange={(e) => handleGroupChange(groupIndex, `word_${wordIndex}`, e.target.value)}
                        placeholder={`Word ${wordIndex + 1}`}
                        className="bg-brand-dark border-brand-cyan text-brand-cyan-bright text-sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              <Button onClick={autoFillWords} className="w-full bg-brand-cyan text-brand-navy">
                <Plus className="w-4 h-4 mr-2" />
                Auto-Fill Main Words Grid
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Words Grid */}
        <Card className="mt-6 bg-brand-navy border-brand-cyan">
          <CardHeader>
            <CardTitle className="text-brand-cyan-bright">Main Words Grid (16 words, shuffled)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {newGame.words.map((word, index) => (
                <Input
                  key={index}
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  placeholder={`Word ${index + 1}`}
                  className="bg-brand-dark border-brand-cyan text-brand-cyan-bright text-center font-semibold"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-6">
          <Button onClick={saveGame} className="bg-brand-cyan text-brand-navy font-bold px-8">
            <Save className="w-4 h-4 mr-2" />
            Save Game
          </Button>
          <Button onClick={() => console.log(newGame)} variant="outline" className="border-brand-cyan text-brand-cyan">
            <Eye className="w-4 h-4 mr-2" />
            Preview JSON
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;