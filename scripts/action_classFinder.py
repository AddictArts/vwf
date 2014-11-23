
fileref = "actions.xml"
datalist = []
switch = 0
dataout = []
with open(fileref, 'r') as f:
	datalist = f.readlines()
	
for line in datalist:
	if switch==1:
		ugly = line.lstrip()
		pos = ugly.find('"') + 1
		pos2 = ugly.rfind('"')
		object = ugly[pos:pos2]
		object += '\n'
		dataout.append(object)
		switch = 0
	if 'var="?class">' in line:
		switch = 1
	
outfile = "actions_simple.txt"
with open(outfile, 'w') as o:
	for line in dataout:
		o.write(line)
