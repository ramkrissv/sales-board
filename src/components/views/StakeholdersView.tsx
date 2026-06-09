'use client';

import { useOpportunities } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Mail, Phone, Link2 as Linkedin, ExternalLink, Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function StakeholdersView() {
  const { opportunities } = useOpportunities();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'decision_maker' | 'primary'>('all');

  // Flatten stakeholders with opportunity context
  const allStakeholders = opportunities.flatMap(opp => 
    opp.customerStakeholders.map(stakeholder => ({
      ...stakeholder,
      opportunityId: opp.id,
      opportunityName: opp.opportunityName,
      customerName: opp.customerName,
      industry: opp.industry,
      region: opp.region
    }))
  );

  const filteredStakeholders = allStakeholders.filter(person => {
    const matchesSearch = 
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' || 
      (roleFilter === 'decision_maker' && person.isDecisionMaker) ||
      (roleFilter === 'primary' && person.isPrimaryContact);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stakeholders</h1>
          <p className="text-muted-foreground mt-1">
            Directory of all customer contacts and key players
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stakeholders..."
              className="pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Role Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contacts</SelectItem>
              <SelectItem value="decision_maker">Decision Makers</SelectItem>
              <SelectItem value="primary">Primary Contacts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="py-4 px-6 border-b bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Showing {filteredStakeholders.length} contacts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name & Title</TableHead>
                <TableHead>Customer / Opportunity</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStakeholders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No stakeholders found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStakeholders.map((person) => (
                  <TableRow key={`${person.opportunityId}-${person.id}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell>
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-slate-100 text-slate-600 font-medium text-xs">
                          {person.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{person.name}</div>
                      <div className="text-xs text-muted-foreground">{person.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{person.customerName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={person.opportunityName}>
                        {person.opportunityName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {person.isDecisionMaker && (
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 text-[10px] px-1.5 h-5 gap-1">
                            <Star className="h-2.5 w-2.5 fill-purple-700" /> Decision Maker
                          </Badge>
                        )}
                        {person.isPrimaryContact && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] px-1.5 h-5">
                            Primary
                          </Badge>
                        )}
                        {!person.isDecisionMaker && !person.isPrimaryContact && (
                          <span className="text-xs text-muted-foreground italic">Stakeholder</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {person.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Mail className="h-3 w-3" />
                            {person.email}
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Phone className="h-3 w-3" />
                            {person.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {person.linkedInUrl && (
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" asChild>
                             <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer">
                               <Linkedin className="h-4 w-4" />
                             </a>
                           </Button>
                         )}
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                           <ExternalLink className="h-4 w-4" />
                         </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}