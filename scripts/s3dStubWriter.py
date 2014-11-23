
'''
reads the hierarchy from a Collada file, and writes that hierarchy out in current <grouping> format for s3d.
'''

import sys
import libfind
from math import *
# from decimal import *


class Node:

	vect = [0, 0, 0]

	def __init__(self, name):
		self.name = name
		self.translate = ['0', '0', '0']
		self.rotateZ = 0; self.rotateY = 0; self.rotateX = 0
		self.scale = [1, 1, 1]
		self.children = []
		self.parent = "root"
		self.Materials = []
		self.geoRef = ""
		self.level = 0
		self.quaternion = [ 0, 1, 0, 0 ]
		self.rotatePivot = [0, 0, 0]
		self.rotatePivotInverse = [0, 0, 0]
		self.scalePivot = [0, 0, 0]
		self.scalePivotInverse = [0, 0, 0]
		
	def settranslate (self, vect):
		self.translate = vect  
		
	def setrotX (self, rot):
		self.rotateX = rot
		
	def setrotY (self, rot):
		self.rotateY = rot
		
	def setrotZ (self, rot):
		self.rotateZ = rot
	
#	def getQuat(self):				# forget having to import decimal for this - not necessary for the s3d writer
#		radZ = radians(float(self.rotateZ))
#		radY = radians(float(self.rotateY))
#		radX = radians(float(self.rotateX))
#		c1 = cos(radZ / 2)
#		c2 = cos(radX / 2)
#		c3 = cos(radY / 2)
#		s1 = sin(radZ / 2)
#		s2 = sin(radX / 2)
#		s3 = sin(radY / 2)
#		w = Decimal(c1 * c2 * c3 - s1 * s2 * s3) * Decimal(1)  # multiplying by Decimal(1) forces Decimal to use reduced significant digits
#		x = Decimal(s1 * s2 * c3 + c1 * c2 * s3) * Decimal(1)
#		y = Decimal(s1 * c2 * c3 + c1 * s2 * s3) * Decimal(1)
#		z = Decimal(c1 * s2 * c3 - s1 * c2 * s3) * Decimal(1)
#		self.quaternion = [ w, x, y, z ]
	
	def setscale (self, scalevect):
		self.scale = scalevect
		
	def addchild (self, child):
		self.children.append(child)
		
	def setparent (self, parent):
		self.parent = parent
		
	def addMaterial (self, Mat):     # Material instances with 'symbol' and 'target'
		self.Materials.append(Mat)
		
	def addGeoRef (self, geoRef):
		self.geoRef = geoRef
		
	def setlevel (self, level):
		self.level = level

	def set_rotatePivot(self, vect):
		self.rotatePivot = vect
		
	def set_rotatePivotInverse(self, vect):
		self.rotatePivotInverse = vect
		
	def set_scalePivot(self, vect):
		self.scalePivot = vect
		
	def set_scalePivotInverse(self, vect):
		self.scalePivotInverse = vect

		
class Scene:
	def __init__(self, name):
		self.name = name
		self.children = []
		
	def addchild (self, child):
		self.children.append(child)
		
		
class Data:
	def __init__(self):
		self.datalist = []
		self.parent_nodes = []
		self.idx = 0
		self.Nodes = []		# list of instances of Node class
		self.Vis_Scenes = []	# list of instances of Scene class
		self.Geodes = []	# list of instances of Geom  -  currently unused
		self.Materials = []  # list of instances of Material
		self.Images = []
		self.Effects = []
		

	def s3dinit(self, s3dStub):
		self.s3dStub = open(s3dStub, "w")
		line = "<grouping>" + "\n"
		self.s3dStub.write(line)
		
	def libread(self, infile, target="<library_visual_scenes>"):
		self.datalist = libfind.fetch(infile, target)
		self.dataLen = len(self.datalist)
		
	def appendScene(self, scene):
		self.Vis_Scenes.append(scene)
		
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
		
	def cleardata(self):
		self.datalist.clear()
					

	
#def georef(Collada):  
#	line = Collada.datalist[Collada.idx]
#	#  get shape name
#	pos_a = line.find('"') + 1
#	stub = line[pos_a:]
#	pos_b = stub.find('"')
#	geoname = stub[:pos_b]
#	Collada.TempNode.addGeoName(geoname)
#	# get material
#	while ("</instance_geometry>" not in line):
#		Collada.idxBump()
#		line = Collada.datalist[Collada.idx]
#		if ("<instance_material symbol=" in line):
#			pos_a = line.find('"') + 1
#			stub = line[pos_a:]
#			pos_b = stub.find('"')
#			matsymbol = stub[:pos_b]
#			latterhalf = stub[pos_b:]
#			pos_a = latterhalf.find('#') + 1
#			latterstub = latterhalf[pos_a:]
#			pos_b = latterstub.find('"')
#			mattarget = latterstub[:pos_b]
#			TempMat = Material(matsymbol, mattarget)
#			Collada.TempNode.addMaterial(TempMat)


			
def sceneeval(Collada):
	Collada.idx = 0		# can't use for/in because of lines 357-371 - previously written to store materials, effects, images, etc.
	while (Collada.idx < Collada.dataLen):
		line = Collada.datalist[Collada.idx]
		if ('<visual_scene id=' in line):
			pos = line.find('name="') + 6
			pob = line.rfind('">')
			name = line[pos:pob]      #  we have scene name
			TempScene = Scene(name)		
		if ('</visual_scene>' in line):
			Collada.appendScene(TempScene)
			Collada.appendNode(Collada.TempNode)  #  to write the last node for that scene
	
		if ('<node id="' in line):
			pos = line.find('name="') + 6
			stub = line[pos:]
			pos = stub.find('"')
			name = stub[:pos]
			if (len(TempScene.children) > 0):	# only when first node listed in current scene			
				Collada.appendNode(Collada.TempNode)	# from previous data. only write previous working node when <node> or </visual_scene>
			Collada.makeNode(name)
			depth = len(Collada.parent_nodes)
			if (depth == 0):
				TempScene.addchild(name)
			else:
				parentName = Collada.parent_nodes[depth-1]
				nodes_listlen = len(Collada.Nodes)
				for idx in range(nodes_listlen):
					someNodeName = Collada.Nodes[idx].name
					if (someNodeName == parentName):
						Collada.Nodes[idx].addchild(name)	# Nodes is a list of instance of Node, addchild is its method
			Collada.appendParent(name)    # append to parent_nodes at <node>, pop from parent_nodes at </node>
			Collada.TempNode.setlevel(depth)	# never implemented using this variable yet
			
		if ("</node>" in line):
			Collada.popNode()
			
		
		if ('<instance_geometry url=' in line):
			pos = line.find('#') + 1
			tailglop = line[pos:]
			pos = tailglop.rfind('">')
			geo = tailglop[:pos]
			Collada.TempNode.addGeoRef(geo)
			# for s3d, ignoring materials
			while ("</instance_geometry>" not in line):
				Collada.idxBump()
				line = Collada.datalist[Collada.idx]
#				if ("<instance_material symbol=" in line):
#					pos_a = line.find('"') + 1
#					stub = line[pos_a:]
#					pos_b = stub.find('"')
#					matsymbol = stub[:pos_b]
#					latterhalf = stub[pos_b:]
#					pos_a = latterhalf.find('#') + 1
#					latterstub = latterhalf[pos_a:]
#					pos_b = latterstub.find('"')
#					mattarget = latterstub[:pos_b]
#					TempMat = Material(matsymbol, mattarget)
#					Collada.TempNode.addMaterial(TempMat)
		Collada.idxBump()
	
		
def nodewriter(InNode, thisIndent, Collada):
	indent = thisIndent + '\t'	# adds more indent on each recursion
	name = InNode.name
	hasGeo = len(InNode.geoRef)
	chids = InNode.children
	if (len(chids) > 0):
		groupname = name + " Group"
		line = indent + '<group name="' + groupname + '">' + "\n"
		Collada.s3dStub.write(line)
		if (hasGeo):
			line = "\t" + indent + '<part node="' + name + '"/>' + "\n"
			Collada.s3dStub.write(line)
	elif ((len(chids) == 0) and hasGeo):
		line = indent + '<part node="' + name + '"/>' + '\n'
		Collada.s3dStub.write(line)

	if (len(chids)>0):		#  only recurses for children and writes </group> on exit, no write while going deeper
		for thisChild in chids:		# names in a list from the node
			for ThisNode in Collada.Nodes:	# nodes in a list from the whole Collada
				if (ThisNode.name == thisChild):
					nodewriter(ThisNode, indent, Collada)
		line = indent + '</group>' + "\n"
		Collada.s3dStub.write(line)
			

			
def main():
#	getcontext().prec = 8	# Decimal makes numbers a little more readable, in this case using 8 significant digits
	infile = str(sys.argv[1])
	position = infile.find(".dae")
	s3dStub = infile[:position] + ".s3dStub"
	Collada = Data()

	tgt = "<library_visual_scenes>"
	Collada.libread(infile, tgt)
	sceneeval(Collada)
	Collada.conflictCheck()
	Collada.s3dinit(s3dStub)
	

	indent = ""
	for ThisScene in Collada.Vis_Scenes:
		numTopNodes = len(ThisScene.children)
		for idx in range(numTopNodes):
			kid = ThisScene.children[idx]
			for ThisNode in Collada.Nodes:
				if (ThisNode.name == kid):
					nodewriter(ThisNode, indent, Collada)
					
					
if __name__== "__main__":
	main()

		
