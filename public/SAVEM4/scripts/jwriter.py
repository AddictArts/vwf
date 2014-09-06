
'''
reads what would be a "master" collada file and writes out 
the hierarchy in JSON format.  Does not yet save out the 
individual parts as separate dae files.
'''

import sys
import libfind
from math import *
from decimal import *


class Node:
	def __init__(self, name):
		self.name = name
		self.translate = ['0', '0', '0']
		self.rotateZ = 0; self.rotateY = 0; self.rotateX = 0
		self.scale = [1, 1, 1]
		self.children = []
		self.parent = "root"
		self.materials = []
		self.geoName = ""
		self.level = 0
		self.quaternion = [ 0, 1, 0, 0 ]
		
	def settranslate (self, transvect):
		self.translate = transvect[0]  # need to code this using try: transvect[0] transvect[1] transvect[2]  and raise error if trans not a 3ple
			
	def setrotX (self, rot):
		self.rotateX = rot
		
	def setrotY (self, rot):
		self.rotateY = rot
		
	def setrotZ (self, rot):
		self.rotateZ = rot
	
	def getQuat(self):
		radZ = radians(float(self.rotateZ))
		radY = radians(float(self.rotateY))
		radX = radians(float(self.rotateX))
		c1 = cos(radZ / 2)
		c2 = cos(radX / 2)
		c3 = cos(radY / 2)
		s1 = sin(radZ / 2)
		s2 = sin(radX / 2)
		s3 = sin(radY / 2)
		w = Decimal(c1 * c2 * c3 - s1 * s2 * s3) * Decimal(1)  # multiplying by Decimal(1) forces Decimal to use reduced significant digits
		x = Decimal(s1 * s2 * c3 + c1 * c2 * s3) * Decimal(1)
		y = Decimal(s1 * c2 * c3 + c1 * s2 * s3) * Decimal(1)
		z = Decimal(c1 * s2 * c3 - s1 * c2 * s3) * Decimal(1)
		self.quaternion = [ w, x, y, z ]
	
	def setscale (self, scalevect):
		self.scale = scalevect
		
	def addchild (self, child):
		self.children.append(child)
		
	def setparent (self, parent):
		self.parent = parent
		
	def addMaterial (self, mat):     # carries mat names only
		self.materials.append(mat)
		
	def addGeoName (self, geoName):
		self.geoName = geoName
		
	def setlevel (self, level):
		self.level = level


class Scene:
	def __init__(self, name):
		self.name = name
		self.children = []
		
	def addchild (self, child):
		self.children.append(child)
		
		
class Data:
	def __init__(self):
		self.scenedata = []
		self.parent_nodes = []
		self.idx = 0
		self.Nodes = []		# list of instances of Node class
		self.vis_scenes = []	# list of instances of Scene class
		self.indent = ""

	def jsoninit(self, jsonfile):
		self.json = open(jsonfile, "w")
		
	def libread(self, infile, target="<library_visual_scenes>"):
		self.scenedata = libfind.fetch(infile, target)
		self.sceneLen = len(self.scenedata)
		
	def appendScene(self, scene):
		self.vis_scenes.append(scene)
		
	def appendNode(self, Node):
		self.Nodes.append(Node)
		
	def popNode(self):
		last = len(self.parent_nodes) - 1
		throwaway = self.parent_nodes.pop(last)
		
	def appendParent(self, name):
		self.parent_nodes.append(name)
		
	def idxBump(self):
		self.idx +=1
		
	def conflictCheck(self):
		nlist = []
		self.totalnodes = len(self.Nodes)
		for idx in range(self.totalnodes):
			ThisNode = self.Nodes[idx]
			name = ThisNode.name
			if (name in nlist):
				print("name conflict in ", name)
				exit(1)
			nlist.append(name)
			
	def makeNode(self, name):
		self.TempNode = Node(name)
		
	def makeScene(self, name):
		self.TempScene = Scene(name)
			

def georeadFake(Collada):
	line = Collada.scenedata[Collada.idx]
	#  Ignore the actual geometry name
	partName = Collada.TempNode.name + ".dae"
	Collada.TempNode.addGeoName(partName)
	# get material
			
			
def georead(Collada):  #  Can't use this because of hidden (rotten) model names in Maya such as "geometries_33"
	line = Collada.scenedata[Collada.idx]
	#  get shape name
	pos = line.find('#') + 1
	valglop = line[pos:]
	pos = valglop.rfind('">')
	geo = valglop[:pos]
	Collada.TempNode.addGeoName(geo)
	# get material
	while ("</instance_geometry>" not in line):
		Collada.idxBump()
		line = Collada.scenedata[Collada.idx]
		if ("<instance_material symbol=" in line):
			pos = line.find('#') + 1
			pob = line.rfind('"')
			mat = line[pos:pob]
			Collada.TempNode.addMaterial(mat)

			
def sceneeval(Collada):
	line = Collada.scenedata[Collada.idx]
	if ('<visual_scene id=' in line):
		pos = line.find('name="') + 6
		pob = line.rfind('">')
		name = line[pos:pob]      #  we have scene name
		Collada.makeScene(name)			# creates Collada.TempScene
	if ('</visual_scene>' in line):
		Collada.appendScene(Collada.TempScene)
		Collada.appendNode(Collada.TempNode)  #  to write the last node for that scene

	if ('<node id="' in line):
		pos = line.find('name="') + 6
		stub = line[pos:]
		pos = stub.find('"')
		name = stub[:pos]
		if (len(Collada.parent_nodes) == 0):   # only the first time <node>  is encountered per scene - won't write TempNode, because no data read yet
			Collada.TempScene.addchild(name)    # scene gets the name of the top-level child nodes
			Collada.makeNode(name)
			Collada.appendParent(name)    # will be the first name in parent_nodes[]
		else:
			Collada.appendNode(Collada.TempNode)   # from previous data. only write previous working node when <node> or </visual_scene> is encountered, because nodes are nested
			depth = len(Collada.parent_nodes)
			parentName = Collada.parent_nodes[depth-1]
			nodes_listlen = len(Collada.Nodes)
			for idx in range(nodes_listlen):
				someNodeName = Collada.Nodes[idx].name
				if (someNodeName == parentName):
					Collada.Nodes[idx].addchild(name)	# Nodes is a list of instance of Node, addchild is its method
			Collada.parent_nodes.append(name)    # append to parent_nodes at <node>, pop from parent_nodes at </node>
			Collada.makeNode(name)							# start new Node to populate
			Collada.TempNode.setlevel(depth)	# never implemented using this variable yet
	if ("</node>" in line):
		Collada.popNode()
	if ('<translate sid="translate"' in line):
		pos = line.rfind('"') + 2
		valglop = line[pos:]
		pos = valglop.find('</translate>')
		valueString = valglop[:pos]
		values = valueString.split()		# should be a vector
		Collada.TempNode.settranslate([values])
	if ('<rotate sid="rotateX' in line):
		pos = line.rfind('"') + 2
		valglop = line[pos:]
		pos = valglop.find('</rotate')
		valueString = valglop[:pos]
		values = valueString.split()
		rot = values[3]						# always the fourth element in the list - Collada lists X Y Z rotation as separate quaternions
		Collada.TempNode.setrotX(rot)
	if ('<rotate sid="rotateY' in line):
		pos = line.rfind('"') + 2
		valglop = line[pos:]
		pos = valglop.find('</rotate')
		valueString = valglop[:pos]
		values = valueString.split()
		rot = values[3]
		Collada.TempNode.setrotY(rot)
	if ('<rotate sid="rotateZ' in line):
		pos = line.rfind('"') + 2
		valglop = line[pos:]
		pos = valglop.find('</rotate')
		valueString = valglop[:pos]
		values = valueString.split()
		rot = values[3]
		Collada.TempNode.setrotZ(rot)
	if ('<scale sid=' in line):
		pos = line.rfind('"') + 2
		valglop = line[pos:]
		pos = valglop.find('</scale')
		valueString = valglop[:pos]
		scaleVect = valueString.split()
		Collada.TempNode.setscale(scaleVect)
	if ('<instance_geometry url=' in line):
		georeadFake(Collada)

		
def nodewriter(InNode, thisIndent, Collada):
	indent = thisIndent + '    '
	name = InNode.name
	line = indent + '"' + name + '"' + ': {' + "\n"
	Collada.json.write(line)
	line = indent + '  "extends": "http://vwf.example.com/node3.vwf",' + "\n"
	Collada.json.write(line)
	hasGeo = len(InNode.geoName)
	chids = InNode.children
	if (hasGeo):
		#  need to add geometry evaluation back into the node eval
		line = indent + '  "type": "model/vnd.collada+xml",' + "\n"
		Collada.json.write(line)
		if (len(chids)>0):
			line = indent + '  "source": "parts/' + InNode.geoName + '",' + "\n"
			Collada.json.write(line)
		else:		# avoids writing erroneous comma after the "source" line if no children following
			line = indent + '  "source": "parts/' + InNode.geoName + '"' + "\n"
			Collada.json.write(line)
#	line = indent + '  properties: {' + "\n"
#	Collada.json.write(line)
#	transtext = '[ ' + str(InNode.translate[0]) + ', ' + str(InNode.translate[1]) + ', ' + str(InNode.translate[2]) + ' ],'
#	line = indent + '    translation: ' + transtext + "\n"
#	Collada.json.write(line)
#	InNode.getQuat()
#	w = str(InNode.quaternion[0]); x = str(InNode.quaternion[1]); y = str(InNode.quaternion[2]); z = str(InNode.quaternion[3])
#	rottext = '[ ' + w + ', ' + x + ', ' + y + ', ' + z + ' ],'
#	line = indent + '    rotation: ' + rottext + "\n"
#	Collada.json.write(line)
#	scaletext = '[ ' + str(InNode.scale[0]) + ', ' + str(InNode.scale[1]) + ', ' + str(InNode.scale[2]) + ' ]'
#	line = indent + '    scale: ' + scaletext + "\n"
#	Collada.json.write(line)

#	if (len(chids)>0):
#		line = indent + '},' + "\n"
#		Collada.json.write(line)
#	else:
#		line = indent + '}' + "\n"
#		Collada.json.write(line)

	if (len(chids)>0):
		line = indent + '  "children": {' + "\n"
		Collada.json.write(line)
		for thisChild in chids:		# names in a list from the node
			for ThisNode in Collada.Nodes:	# nodes in a list from the whole Collada
				if (ThisNode.name == thisChild):
					nodewriter(ThisNode, indent, Collada)
		line = indent + '  }' + "\n"
		Collada.json.write(line)
	line = indent + '}' + "\n"
	Collada.json.write(line)  

	
def json_start(Collada):
	line = "{" + "\n"
	Collada.json.write(line)
	line = "  " + '"extends": "http://vwf.example.com/node3.vwf",' + "\n"
	Collada.json.write(line)
	line = "  " + '"properties": {' + "\n"
	Collada.json.write(line)
	line = "    " + '"translation": [ 0, 0, 2 ],' + "\n"
	Collada.json.write(line)
	line = "    " + '"rotation": [ 0, 0, 1, 90 ],' + "\n"
	Collada.json.write(line)
	line = "    " + '"scale": [ 1, 1, 1 ]' + "\n"
	Collada.json.write(line)
	line = "  " + "}," + "\n"
	Collada.json.write(line)
	line = "  " + '"children": {' + "\n"
	Collada.json.write(line)
	Collada.indent = ""
	
def main():
	getcontext().prec = 8
	infile = str(sys.argv[1])
	position = infile.find(".dae")
	jsonFile = infile[:position] + ".json"
	tgt = "<library_visual_scenes>"
	Collada = Data()
	Collada.libread(infile, tgt)
	while (Collada.idx < Collada.sceneLen):
		sceneeval(Collada)
		Collada.idxBump()	
	
	Collada.conflictCheck()
	Collada.jsoninit(jsonFile)
	json_start(Collada)

	indent = ""
	for ThisScene in Collada.vis_scenes:
		numTopNodes = len(ThisScene.children)
		for idx in range(numTopNodes):
			kid = ThisScene.children[idx]
			for ThisNode in Collada.Nodes:
				if (ThisNode.name == kid):
					nodewriter(ThisNode, indent, Collada)
					
					
if __name__== "__main__":
	main()

		
